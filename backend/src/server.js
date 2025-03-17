require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pdfParse = require('pdf-parse');
const natural = require('natural');
const stopword = require('stopword');
const { TfIdf } = natural;
const axios = require('axios'); // Add axios for API requests

const app = express();
const PORT = process.env.PORT || 3000;

// OpenRouter API configuration
// const OPENROUTER_API_KEY = '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';
const OPENROUTER_API_KEY = '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'deepseek/deepseek-r1-distill-qwen-32b:free';

// Configure CORS to allow requests from the Chrome extension
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST'], // Allow these HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'] // Allow these headers
}));

// Configure express to handle JSON data with increased size limit
app.use(express.json({ limit: '50mb' })); // Increased limit for larger PDFs
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/', (req, res) => {
  res.send('LinkedIn Job Analyzer API is running');
});

app.post('/api/upload-resume', async (req, res) => {
  try {
    console.log('Received resume upload request');
    
    // Validate request body
    if (!req.body) {
      console.error('Empty request body');
      return res.status(400).json({ error: 'Empty request body' });
    }
    
    const { resumeData } = req.body;
    
    // Check if resumeData exists
    if (!resumeData) {
      console.error('No resume data provided in request body');
      return res.status(400).json({ error: 'No resume data provided' });
    }
    
    // Check if resumeData has content
    if (typeof resumeData !== 'string' || resumeData.trim().length === 0) {
      console.error('Resume data is empty or not a string');
      return res.status(400).json({ error: 'Resume data must be a non-empty string' });
    }
    
    console.log('Resume data received, length:', resumeData.length);
    console.log('First 50 characters:', resumeData.substring(0, 50));
    
    // Convert base64 to buffer
    let buffer;
    try {
      // Try to clean up the base64 string if necessary
      let cleanData = resumeData;
      
      // Check if the data starts with data:application/pdf;base64, and remove it if present
      if (cleanData.startsWith('data:application/pdf;base64,')) {
        console.log('Found PDF data URI prefix, removing it');
        cleanData = cleanData.replace('data:application/pdf;base64,', '');
      }
      
      // Remove any whitespace that might have been added
      cleanData = cleanData.replace(/\s/g, '');
      
      // Try to decode the base64
      try {
        buffer = Buffer.from(cleanData, 'base64');
        console.log('Converted base64 to buffer, size:', buffer.length);
        
        if (buffer.length === 0) {
          throw new Error('Buffer is empty after conversion');
        }
      } catch (decodeError) {
        console.error('Error decoding base64 data:', decodeError);
        return res.status(400).json({ error: 'Invalid base64 encoding in PDF data' });
      }
    } catch (error) {
      console.error('Error converting base64 to buffer:', error);
      return res.status(400).json({ error: 'Invalid base64 data: ' + error.message });
    }
    
    // Parse PDF
    let pdfData;
    try {
      // Add a timeout to prevent hanging on corrupted PDFs
      const pdfParsePromise = pdfParse(buffer);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('PDF parsing timed out after 10 seconds')), 10000)
      );
      
      pdfData = await Promise.race([pdfParsePromise, timeoutPromise]);
      
      console.log('PDF parsed successfully, text length:', pdfData.text.length);
      
      if (!pdfData.text || pdfData.text.trim().length === 0) {
        throw new Error('Extracted text is empty');
      }
    } catch (error) {
      console.error('Error parsing PDF:', error);
      return res.status(400).json({ error: 'Failed to parse PDF: ' + (error.message || 'Unknown error') });
    }
    
    // Extract text from PDF
    const resumeText = pdfData.text;
    
    // Process resume text
    const processedResume = processResumeText(resumeText);
    console.log('Resume processed successfully with', processedResume.keywords.length, 'keywords');
    
    res.json({ 
      success: true, 
      processedResume 
    });
  } catch (error) {
    console.error('Error processing resume:', error);
    res.status(500).json({ error: 'Failed to process resume: ' + (error.message || 'Unknown error') });
  }
});

// API endpoint to match jobs with resume using DeepSeek R1 model
app.post('/api/match-jobs', async (req, res) => {
  try {
    console.log('Received job matching request');
    
    // Validate request body
    if (!req.body) {
      console.error('Empty request body');
      return res.status(400).json({ error: 'Empty request body' });
    }
    
    const { resumeData, jobs, start = 0, limit = 10, requiredLanguages = ['en'] } = req.body;
    
    // Check if resumeData and jobs exist
    if (!resumeData) {
      console.error('No resume data provided');
      return res.status(400).json({ error: 'Resume data is required' });
    }
    
    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      console.error('No jobs provided or invalid format');
      return res.status(400).json({ error: 'Jobs must be a non-empty array' });
    }
    
    console.log('Required languages for jobs:', requiredLanguages);
    
    // Convert start and limit to numbers if they're strings
    const startIndex = Number(start);
    const jobLimit = Number(limit);
    
    console.log(`Total jobs to analyze: ${jobs.length}`);
    
    // Get resume text for comparison
    const resumeText = resumeData.text || '';
    if (resumeText.length === 0) {
      console.error('Resume text is empty');
      return res.status(400).json({ error: 'Resume text is empty' });
    }
    
    // Process ALL jobs, not just a paginated subset
    // This ensures we rank all jobs at once and return them to the frontend
    console.log(`Processing all ${jobs.length} jobs for analysis`);
    
    // Match jobs with resume using DeepSeek R1 model
    const rankings = await matchJobsWithResumeAI(resumeText, jobs, requiredLanguages);
    console.log('AI job matching complete, ranked', rankings.length, 'jobs out of', jobs.length, 'total');
    
    // Return the results - the frontend will handle pagination
    console.log(`Returning all ${rankings.length} ranked jobs to the client for frontend pagination`);
    
    // Create pagination object without referencing endIndex
    const paginationInfo = {
      start: startIndex,
      limit: jobLimit,
      total: jobs.length,
      processed: jobs.length,
      ranked: rankings.length,
      hasMore: rankings.length > 10 // Let frontend know there are more jobs to display
    };
    
    // Log the pagination object for debugging
    console.log('Pagination info:', JSON.stringify(paginationInfo));
    
    // Send the response
    res.json({ 
      success: true, 
      rankings,
      pagination: paginationInfo
    });
  } catch (error) {
    console.error('Error matching jobs:', error);
    res.status(500).json({ error: 'Failed to match jobs with resume: ' + (error.message || 'Unknown error') });
  }
});

// Process resume text - keeping for keyword extraction
function processResumeText(text) {
  // Tokenize text
  const tokenizer = new natural.WordTokenizer();
  let tokens = tokenizer.tokenize(text.toLowerCase());
  
  // Remove stopwords
  tokens = stopword.removeStopwords(tokens);
  
  // Remove non-alphabetic tokens and very short tokens
  tokens = tokens.filter(token => /^[a-z]+$/.test(token) && token.length > 2);
  
  // Extract skills and keywords using TF-IDF
  const tfidf = new TfIdf();
  tfidf.addDocument(tokens.join(' '));
  
  // Get top keywords
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

// Match jobs with resume using DeepSeek R1 model through OpenRouter API
async function matchJobsWithResumeAI(resumeText, jobs, requiredLanguages) {
  console.log('Using DeepSeek AI for job matching');
  
  // Process jobs in batches to avoid rate limits and timeouts
  const batchSize = 3;
  const batches = [];
  
  for (let i = 0; i < jobs.length; i += batchSize) {
    batches.push(jobs.slice(i, i + batchSize));
  }
  
  console.log(`Processing ${jobs.length} jobs in ${batches.length} batches`);
  
  let allResults = [];
  
  // Process each batch
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Processing batch ${i+1} of ${batches.length}, containing ${batch.length} jobs`);
    
    const batchResults = await Promise.all(
      batch.map(job => analyzeJobMatchWithAI(resumeText, job, requiredLanguages))
    );
    
    allResults = [...allResults, ...batchResults];
    
    // Add a small delay between batches to avoid rate limits
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Sort job rankings by score (descending)
  return allResults.sort((a, b) => b.score - a.score);
}

// Analyze a single job match with DeepSeek AI
async function analyzeJobMatchWithAI(resumeText, job, requiredLanguages) {
  try {
    // Limit the length of inputs to avoid token limits
    const truncatedResume = resumeText.substring(0, 1500);
    const truncatedDescription = job.description ? job.description.substring(0, 1500) : '';
    
    // Detect language requirements in the job description
    const detectedLanguages = detectLanguageRequirements(truncatedDescription);
    
    // If no languages detected, assume English by default
    const jobLanguages = detectedLanguages.length > 0 ? detectedLanguages : ['en'];
    
    // Calculate language match score - this will heavily influence the final score
    const languageMatchScore = calculateLanguageMatchScore(requiredLanguages, jobLanguages);
    
    console.log(`Job "${job.title}" - Detected languages: [${jobLanguages.join(', ')}], User required: [${requiredLanguages.join(', ')}], Match score: ${languageMatchScore}`);
    
    // Skip detailed analysis if language match is very low
    if (languageMatchScore <= 0.1) {
      console.log(`Language mismatch for job "${job.title}" - setting low score`);
      return {
        ...job,
        score: 0.1,
        matchPercentage: "10%",
        matchingKeywords: [],
        keySkills: [],
        languageRequirements: jobLanguages,
        languageMatch: languageMatchScore
      };
    }
    
    // Create prompt for the AI
    const prompt = `
    Task: Analyze how well a candidate's resume matches a job description.
    
    Resume:
    ${truncatedResume}
    
    Job Title: ${job.title}
    Company: ${job.company}
    Job Description:
    ${truncatedDescription}
    
    First, identify 5-10 key skills or qualifications from the job description.
    Then determine how well the resume matches each of these requirements.
    Finally, calculate an overall match percentage (0-100) and list the 3-5 most important matching keywords.
    
    Return your analysis as a JSON object with these exact fields:
    {
      "score": <number between 0 and 1>,
      "matchPercentage": "<number>%",
      "matchingKeywords": ["keyword1", "keyword2", "keyword3"],
      "keySkills": ["skill1", "skill2", "skill3", "skill4", "skill5"]
    }
    
    Important: Return ONLY the JSON object with no other text or formatting.
    `;
    
    console.log(`Sending job "${job.title}" to OpenRouter API`);
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: "system",
            content: "You are an expert job matching assistant that analyzes resumes and job descriptions to determine match compatibility. You always respond with clean JSON without any formatting, markdown, or LaTeX."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Process the AI response
    console.log(`Received response from OpenRouter API for job "${job.title}"`);
    const aiResponse = response.data.choices[0].message.content;
    
    // Extract the JSON from the response
    try {
      // Clean up the response to handle various formats the model might return
      let cleanedResponse = aiResponse;
      
      // Log raw response for debugging
      console.log('Raw AI response:', cleanedResponse);
      
      // Handle \boxed{} LaTeX format
      if (cleanedResponse.includes('\\boxed{')) {
        cleanedResponse = cleanedResponse.replace('\\boxed{', '').replace(/}$/, '');
      }
      
      // Handle markdown code blocks with ```json
      cleanedResponse = cleanedResponse.replace(/```json|```/g, '');
      
      // Find the JSON object in the response
      const jsonRegex = /{[\s\S]*}/;
      const jsonMatch = cleanedResponse.match(jsonRegex);
      
      if (jsonMatch) {
        console.log('Extracted JSON:', jsonMatch[0]);
        const matchResult = JSON.parse(jsonMatch[0]);
        
        // Apply language match as a scaling factor (high weight to language matching)
        const finalScore = matchResult.score * languageMatchScore;
        
        // Adjust match percentage based on language match
        const originalMatchPercent = parseInt(matchResult.matchPercentage);
        const adjustedMatchPercent = Math.round(originalMatchPercent * languageMatchScore);
        
        return {
          ...job,
          score: finalScore,
          matchPercentage: `${adjustedMatchPercent}%`,
          matchingKeywords: matchResult.matchingKeywords || [],
          keySkills: matchResult.keySkills || [],
          languageRequirements: jobLanguages,
          languageMatch: languageMatchScore
        };
      } else {
        console.error('No valid JSON found in AI response');
        // Fallback to basic matching if AI didn't return valid JSON
        return {
          ...job,
          score: 0.1 * languageMatchScore,  // Default low score
          matchPercentage: `${Math.round(10 * languageMatchScore)}%`,
          matchingKeywords: [],
          keySkills: [],
          languageRequirements: jobLanguages,
          languageMatch: languageMatchScore
        };
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.log('AI response content:', aiResponse);
      
      // Try a more aggressive JSON extraction as a fallback
      try {
        // Find anything that looks like a JSON object with our expected fields
        const fallbackRegex = /"score"[\s\S]*"matchPercentage"[\s\S]*"matchingKeywords"[\s\S]*"keySkills"/;
        const fallbackMatch = aiResponse.match(fallbackRegex);
        
        if (fallbackMatch) {
          // Try to extract just the JSON object part
          const jsonStartIndex = aiResponse.lastIndexOf('{', fallbackMatch.index);
          const jsonEndIndex = aiResponse.indexOf('}', fallbackMatch.index + fallbackMatch[0].length);
          
          if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
            const jsonString = aiResponse.substring(jsonStartIndex, jsonEndIndex + 1);
            console.log('Attempting fallback JSON extraction:', jsonString);
            const fallbackResult = JSON.parse(jsonString);
            
            // Apply language match score with high weighting
            const finalScore = (fallbackResult.score || 0.2) * languageMatchScore;
            const originalMatchPercent = parseInt(fallbackResult.matchPercentage || "20%");
            const adjustedMatchPercent = Math.round(originalMatchPercent * languageMatchScore);
            
            return {
              ...job,
              score: finalScore,
              matchPercentage: `${adjustedMatchPercent}%`,
              matchingKeywords: fallbackResult.matchingKeywords || [],
              keySkills: fallbackResult.keySkills || [],
              languageRequirements: jobLanguages,
              languageMatch: languageMatchScore
            };
          }
        }
      } catch (fallbackError) {
        console.error('Fallback JSON extraction also failed:', fallbackError);
      }
      
      // If all parsing attempts fail, return a default object
      return {
        ...job,
        score: 0.1 * languageMatchScore,
        matchPercentage: `${Math.round(10 * languageMatchScore)}%`,
        matchingKeywords: [],
        keySkills: [],
        languageRequirements: jobLanguages,
        languageMatch: languageMatchScore
      };
    }
  } catch (error) {
    console.error(`Error analyzing job match with AI for job "${job.title}":`, error);
    
    // Return a default object in case of error
    return {
      ...job,
      score: 0,
      matchPercentage: "0%",
      matchingKeywords: [],
      keySkills: [],
      languageRequirements: ['en'],
      languageMatch: 0
    };
  }
}

// Detect language requirements in job description
function detectLanguageRequirements(jobDescription) {
  if (!jobDescription) return ['en']; // Default to English if no description
  
  const description = jobDescription.toLowerCase();
  const detectedLanguages = [];
  
  // Map of language names, keywords, and codes
  const languageData = [
    { code: 'en', keywords: ['english', 'native english', 'fluent english'] },
    { code: 'fr', keywords: ['french', 'français', 'francais'] },
    { code: 'de', keywords: ['german', 'deutsch'] },
    { code: 'es', keywords: ['spanish', 'español', 'espanol'] },
    { code: 'it', keywords: ['italian', 'italiano'] },
    { code: 'pt', keywords: ['portuguese', 'português', 'portugues'] },
    { code: 'nl', keywords: ['dutch', 'nederlands'] }
  ];
  
  // Common phrases that indicate language requirements
  const languagePhrases = [
    'language requirement', 'language skill', 'language proficiency',
    'fluent in', 'proficient in', 'native speaker', 'business level',
    'working knowledge of', 'ability to speak', 'ability to write',
    'communication skill', 'written and verbal', 'verbal and written'
  ];
  
  // Check if the job description mentions language requirements
  const hasLanguageRequirement = languagePhrases.some(phrase => 
    description.includes(phrase)
  );
  
  // Detect specific languages
  languageData.forEach(lang => {
    if (lang.keywords.some(keyword => description.includes(keyword))) {
      detectedLanguages.push(lang.code);
    }
  });
  
  // If no specific language is detected but language requirements are mentioned
  // Look for sentences containing language requirements and try to extract languages
  if (detectedLanguages.length === 0 && hasLanguageRequirement) {
    // Default to English if language requirements mentioned but specific language not detected
    detectedLanguages.push('en');
  }
  
  // If no languages detected at all, default to English
  if (detectedLanguages.length === 0) {
    detectedLanguages.push('en');
  }
  
  return detectedLanguages;
}

// Calculate language match score based on required languages and job languages
function calculateLanguageMatchScore(requiredLanguages, jobLanguages) {
  // If no languages specified by user or job, default to perfect match (English)
  if (requiredLanguages.length === 0 && jobLanguages.length === 0) {
    return 1.0;
  }
  
  // If user didn't specify languages, assume they want any language match
  if (requiredLanguages.length === 0) {
    return 1.0;
  }
  
  // Check for language matches
  const matchingLanguages = requiredLanguages.filter(lang => 
    jobLanguages.includes(lang)
  );
  
  // Calculate match score - New interpretation:
  // - requiredLanguages = languages the user knows/speaks
  // - jobLanguages = languages the job requires
  
  if (matchingLanguages.length === 0) {
    // No matching languages - user can't speak any of the required languages
    return 0.1; // 90% reduction in score - this is a real problem
  } else if (matchingLanguages.length === jobLanguages.length) {
    // Perfect match - user speaks all languages required by the job
    return 1.0; // No reduction in score
  } else if (matchingLanguages.length >= jobLanguages.length) {
    // User speaks more languages than the job requires
    return 1.0; // No reduction - this is also a perfect match
  } else {
    // User speaks some but not all required languages
    // Calculate a proportional score based on how many required languages they speak
    const proportionMatched = matchingLanguages.length / jobLanguages.length;
    // Use a minimum score of 0.5 to avoid too much penalty
    return Math.max(0.5, proportionMatched);
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 