require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pdfParse = require('pdf-parse');
const natural = require('natural');
const stopword = require('stopword');
const { TfIdf } = natural;
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = process.env.GEMINI_API_URL;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/', (req, res) => {
  res.send('LinkedIn Job Analyzer API is running');
});

app.post('/api/upload-resume', async (req, res) => {
  try {
    console.log('Received resume upload request');
    
    if (!req.body) {
      console.error('Empty request body');
      return res.status(400).json({ error: 'Empty request body' });
    }
    
    const { resumeData } = req.body;
    
    if (!resumeData) {
      console.error('No resume data provided in request body');
      return res.status(400).json({ error: 'No resume data provided' });
    }
    
    if (typeof resumeData !== 'string' || resumeData.trim().length === 0) {
      console.error('Resume data is empty or not a string');
      return res.status(400).json({ error: 'Resume data must be a non-empty string' });
    }
    
    console.log('Resume data received, length:', resumeData.length);
    
    let buffer;
    try {
      let cleanData = resumeData;
      
      if (cleanData.startsWith('data:application/pdf;base64,')) {
        cleanData = cleanData.replace('data:application/pdf;base64,', '');
      }
      
      cleanData = cleanData.replace(/\s/g, '');
      
      buffer = Buffer.from(cleanData, 'base64');
      if (buffer.length === 0) {
        throw new Error('Buffer is empty after conversion');
      }
    } catch (error) {
      console.error('Error converting base64 to buffer:', error);
      return res.status(400).json({ error: 'Invalid base64 data: ' + error.message });
    }
    
    let pdfData;
    try {
      const pdfParsePromise = pdfParse(buffer);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('PDF parsing timed out after 10 seconds')), 10000)
      );
      
      pdfData = await Promise.race([pdfParsePromise, timeoutPromise]);
      
      if (!pdfData.text || pdfData.text.trim().length === 0) {
        throw new Error('Extracted text is empty');
      }
    } catch (error) {
      console.error('Error parsing PDF:', error);
      return res.status(400).json({ error: 'Failed to parse PDF: ' + error.message });
    }
    
    const resumeText = pdfData.text;
    const processedResume = processResumeText(resumeText);
    
    res.json({ 
      success: true, 
      processedResume 
    });
  } catch (error) {
    console.error('Error processing resume:', error);
    res.status(500).json({ error: 'Failed to process resume: ' + error.message });
  }
});

app.post('/api/match-jobs', async (req, res) => {
  try {
    console.log('Received job matching request');
    
    if (!req.body) {
      return res.status(400).json({ error: 'Empty request body' });
    }
    
    const { resumeData, jobs, start = 0, limit = 10 } = req.body;
    
    if (!resumeData) {
      return res.status(400).json({ error: 'Resume data is required' });
    }
    
    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({ error: 'Jobs must be a non-empty array' });
    }
    
    console.log(`Processing ${jobs.length} jobs for analysis`);
    
    const resumeText = resumeData.text || '';
    if (resumeText.length === 0) {
      return res.status(400).json({ error: 'Resume text is empty' });
    }
    
    const rankings = await matchJobsWithResumeAI(resumeText, jobs);
    
    const paginationInfo = {
      start: Number(start),
      limit: Number(limit),
      total: jobs.length,
      processed: jobs.length,
      ranked: rankings.length,
      hasMore: rankings.length > 10
    };
    
    res.json({
      success: true,
      rankings,
      pagination: paginationInfo
    });
  } catch (error) {
    console.error('Error matching jobs:', error);
    res.status(500).json({ error: 'Failed to match jobs: ' + error.message });
  }
});

function processResumeText(text) {
  const tokenizer = new natural.WordTokenizer();
  let tokens = tokenizer.tokenize(text.toLowerCase());
  tokens = stopword.removeStopwords(tokens);
  tokens = tokens.filter(token => /^[a-z]+$/.test(token) && token.length > 2);
  
  const tfidf = new TfIdf();
  tfidf.addDocument(tokens.join(' '));
  
  const keywords = [];
  tfidf.listTerms(0).slice(0, 50).forEach(item => {
    keywords.push({
      term: item.term,
      tfidf: item.tfidf
    });
  });
  
  return {
    text,
    tokens,
    keywords
  };
}

async function matchJobsWithResumeAI(resumeText, jobs) {
  console.log('Using Google Gemini API for job matching with efficient batching');
  
  const batchSize = 5;
  const batches = [];
  
  for (let i = 0; i < jobs.length; i += batchSize) {
    batches.push(jobs.slice(i, i + batchSize));
  }
  
  let allResults = [];
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Processing batch ${i+1} of ${batches.length}`);
    
    try {
      const batchResults = await analyzeJobsBatchWithAI(resumeText, batch);
      allResults = [...allResults, ...batchResults];
      
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`Error processing batch ${i+1}:`, error);
      if (error.response && error.response.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        try {
          const smallerBatches = [];
          for (let j = 0; j < batch.length; j += Math.ceil(batch.length/2)) {
            smallerBatches.push(batch.slice(j, j + Math.ceil(batch.length/2)));
          }
          
          let retryResults = [];
          for (const smallBatch of smallerBatches) {
            const smallBatchResults = await analyzeJobsBatchWithAI(resumeText, smallBatch);
            retryResults = [...retryResults, ...smallBatchResults];
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          allResults = [...allResults, ...retryResults];
        } catch (retryError) {
          const fallbackResults = batch.map(job => createFallbackJobMatch(job));
          allResults = [...allResults, ...fallbackResults];
        }
      } else {
        const fallbackResults = batch.map(job => createFallbackJobMatch(job));
        allResults = [...allResults, ...fallbackResults];
      }
    }
  }
  
  return allResults.sort((a, b) => b.score - a.score);
}

function createFallbackJobMatch(job) {
  return {
    ...job,
    score: 0.5,
    matchPercentage: "50%",
    matchingKeywords: [],
    keySkills: [],
    analysis: 'Generated as fallback due to API issues',
    isFallback: true
  };
}

async function analyzeJobsBatchWithAI(resumeText, jobs) {
  const truncatedResume = resumeText.substring(0, 1500);
  
  const jobsData = jobs.map(job => ({
    id: job.id,
    title: job.title || 'Unknown Position',
    company: job.company || 'Unknown Company',
    description: job.description ? job.description.substring(0, 1200) : ''
  }));
  
  const prompt = `
  You are an AI resume matcher that analyzes how well a resume matches multiple job descriptions.
  
  RESUME:
  ${truncatedResume}
  
  JOB DESCRIPTIONS TO ANALYZE:
  ${jobsData.map((job, index) => `
  JOB ${index + 1}:
  Title: ${job.title}
  Company: ${job.company}
  Description: ${job.description}
  `).join('\n')}
  
  For EACH job, provide an analysis in a JSON object with the following structure:
  {
    "results": [
      {
        "jobIndex": 0,
        "score": 0.75,
        "matched_skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
        "required_skills": ["skill1", "skill2", "skill3", "skill4", "skill5", "skill6", "skill7", "skill8", "skill9", "skill10"],
        "analysis": "Brief analysis of the match (1-2 sentences max)"
      }
    ]
  }
  
  Return ONLY the JSON structure with no additional text or explanations.
  `;
  
  const payload = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 2048,
      responseMimeType: "application/json"
    }
  };
  
  try {
    const response = await axios.post(
      GEMINI_API_URL,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data?.candidates?.[0]?.content) {
      const responseText = response.data.candidates[0].content.parts[0].text;
      
      let parsedResponse;
      try {
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                         responseText.match(/```\n([\s\S]*?)\n```/) ||
                         responseText.match(/{[\s\S]*}/);
                          
        const jsonText = jsonMatch ? jsonMatch[0].replace(/```json\n|```\n|```/g, '') : responseText;
        parsedResponse = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        
        const resultsArray = [];
        const jobResultsPattern = /"jobIndex":\s*(\d+),\s*"score":\s*(0\.\d+)/g;
        let match;
        
        while ((match = jobResultsPattern.exec(responseText)) !== null) {
          const jobIndex = parseInt(match[1]);
          const score = parseFloat(match[2]);
          
          const matchedSkillsMatch = responseText.substring(match.index).match(/"matched_skills":\s*\[(.*?)\]/s);
          const matchedSkills = matchedSkillsMatch ? 
            matchedSkillsMatch[1].split(',').map(s => s.trim().replace(/"/g, '')) : [];
          
          const requiredSkillsMatch = responseText.substring(match.index).match(/"required_skills":\s*\[(.*?)\]/s);
          const requiredSkills = requiredSkillsMatch ? 
            requiredSkillsMatch[1].split(',').map(s => s.trim().replace(/"/g, '')) : [];
          
          const analysisMatch = responseText.substring(match.index).match(/"analysis":\s*"([^"]*)"/s);
          const analysis = analysisMatch ? analysisMatch[1] : '';
          
          resultsArray.push({
            jobIndex,
            score,
            matched_skills: matchedSkills,
            required_skills: requiredSkills,
            analysis
          });
        }
        
        if (resultsArray.length > 0) {
          parsedResponse = { results: resultsArray };
        } else {
          throw new Error('Failed to extract job results from response');
        }
      }
      
      if (!parsedResponse?.results?.length) {
        throw new Error('Invalid response format from Gemini API');
      }
      
      return parsedResponse.results.map(result => {
        const jobData = jobsData[result.jobIndex];
        const originalJob = jobs.find(j => j.id === jobData.id);
        
        if (!originalJob) {
          console.error(`Original job not found for ID ${jobData.id}`);
          return null;
        }
        
        return {
          ...originalJob,
          score: result.score,
          matchPercentage: `${Math.round(result.score * 100)}%`,
          matchingKeywords: result.matched_skills || [],
          keySkills: result.required_skills || [],
          analysis: result.analysis || ''
        };
      }).filter(Boolean);
    }
    
    throw new Error('Unexpected response format from Gemini API');
  } catch (error) {
    console.error('Error analyzing job batch:', error);
    throw error;
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; 