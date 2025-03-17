# LinkedIn Job Analyzer Chrome Extension

A Chrome extension that analyzes your resume against LinkedIn job listings to find the best matches using natural language processing (NLP).

## Features

- **Resume Analysis**: Upload your PDF resume and extract relevant skills and keywords.
- **LinkedIn Integration**: Automatically extracts job listings from LinkedIn job search pages.
- **Job Ranking**: Ranks jobs based on how well they match your resume using TF-IDF and cosine similarity.
- **Real-time Results**: See ranked job listings directly within LinkedIn, sorted from best to worst match.

## Project Structure

This project consists of two main components:

1. **Chrome Extension (React + MUI)**
   - Frontend UI for resume upload and displaying job rankings
   - Content script to extract job details from LinkedIn
   - Background script to communicate with the backend

2. **Node.js Backend (Express)**
   - Processes resume PDF files
   - Matches job descriptions with resume skills
   - Ranks job listings by relevance

## Setup and Installation

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)
- Chrome Browser

### Setting Up the Backend

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file (you can copy from `.env.example`):
   ```
   cp .env.example .env
   ```

4. Start the backend server:
   ```
   npm run dev
   ```

   The server will run on http://localhost:3000

### Setting Up the Chrome Extension

1. Navigate to the extension directory:
   ```
   cd extension
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the extension:
   ```
   npm run build
   ```

4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top-right corner
   - Click "Load unpacked" and select the `extension/dist` directory

## Usage

1. Navigate to LinkedIn job search page (e.g., https://www.linkedin.com/jobs/)
2. Click on the LinkedIn Job Analyzer extension icon in your Chrome toolbar
3. Upload your resume (PDF only)
4. View the ranked job listings in the extension popup
5. Click on any job in the list to highlight it on the LinkedIn page

## Development

### Running in Development Mode

- For the backend:
  ```
  cd backend
  npm run dev
  ```

- For the extension:
  ```
  cd extension
  npm start
  ```

- Load the unpacked extension from the `extension/dist` directory

### Building for Production

- Backend:
  ```
  cd backend
  npm start
  ```

- Extension:
  ```
  cd extension
  npm run build
  ```

## NLP Implementation

The application uses the following NLP techniques:

- **TF-IDF (Term Frequency-Inverse Document Frequency)**: To identify important keywords in both the resume and job descriptions.
- **Cosine Similarity**: To measure the similarity between resume content and job descriptions.
- **Stopword Removal**: To filter out common words that don't carry significant meaning.

## Future Enhancements

- Add support for more resume formats (DOCX, RTF, etc.)
- Implement more advanced NLP techniques (Word2Vec, BERT, etc.)
- Add ability to save favorite jobs
- Implement user authentication to save resume data
- Add support for DeepSeek R1 or similar LLMs for more accurate semantic matching

## License

MIT

## Acknowledgements

- [Natural](https://github.com/NaturalNode/natural) - NLP library for Node.js
- [pdf-parse](https://github.com/modesty/pdf2json) - PDF parsing library
- [React](https://reactjs.org/) - UI library
- [Material-UI](https://mui.com/) - React UI framework

## Troubleshooting

### Job Rankings Not Appearing

If you've uploaded your resume but no job rankings appear when clicking "Refresh" or "Analyze Jobs", try the following steps:

1. **Ensure Backend Server is Running**
   - Verify that the backend server is running at http://localhost:3000
   - You should see "LinkedIn Job Analyzer API is running" when visiting this URL in your browser
   - If not running, start it with:
   ```
   cd backend
   npm run dev
   ```

2. **Check the Console for Errors**
   - Right-click on the extension popup and select "Inspect"
   - Go to the Console tab to see any error messages
   - Common errors:
     - "Failed to fetch" - Backend server isn't running
     - "No job listings available" - Extension couldn't find jobs on the LinkedIn page

3. **Verify LinkedIn Job Listings**
   - Make sure you're on a LinkedIn jobs search page
   - Ensure there are visible job listings on the page
   - Try scrolling down to load more jobs

4. **Refresh the Page and Extension**
   - Refresh the LinkedIn page to ensure job listings are properly loaded
   - Close and reopen the extension popup

5. **Debug in Developer Mode**
   - Open Chrome DevTools for the background page of the extension:
     - Go to `chrome://extensions/`
     - Find the extension and click "background page" under "Inspect views"
   - Check for errors in the Console tab

6. **Manual API Testing**
   - Test the backend API directly using a tool like Postman or Insomnia
   - Try calling `/api/upload-resume` and `/api/match-jobs` to verify they work correctly

If the issue persists, try rebuilding the extension:
```
cd extension
npm run build
```

Then reload the extension from `chrome://extensions/` page. 