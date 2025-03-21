import { JobRanking } from '../components/JobRankings';

// Format the score as a percentage
export function formatScore(job: JobRanking): string {
  // Use matchPercentage if available, otherwise calculate from score
  if (job.matchPercentage) {
    return job.matchPercentage;
  }
  return `${Math.round(job.score * 100)}%`;
}

// Get color based on score
export function getScoreColor(job: JobRanking): string {
  // Get numeric value from either matchPercentage or score
  let percentage = 0;
  if (job.matchPercentage) {
    // Extract number from strings like "85%"
    percentage = parseInt(job.matchPercentage.replace('%', ''), 10);
  } else {
    percentage = Math.round(job.score * 100);
  }
  
  if (percentage >= 80) return 'success';
  if (percentage >= 60) return 'primary';
  if (percentage >= 40) return 'warning';
  return 'error';
}

// Generate company initials for the avatar
export function getCompanyInitials(company: string): string {
  if (!company) return 'JB';
  
  const words = company.split(' ');
  
  if (words.length === 1) {
    return company.substring(0, 2).toUpperCase();
  }
  
  return (words[0][0] + words[1][0]).toUpperCase();
} 