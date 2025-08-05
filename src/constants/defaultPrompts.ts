import type { PromptTemplate } from '../types/index.js';

export const DEFAULT_PROMPTS: PromptTemplate[] = [
  {
    name: 'Default',
    content: '',
  },
  {
    name: '1 on 1',
    content: `Meeting Type: 1:1 Meeting

Meeting Goal: To capture meeting notes in a concise and actionable format. Focus on immediate priorities, progress, challenges, and personal feedback, ensuring the notes are structured for clarity, efficiency, and easy follow-up.

Output Sections:

Top of Mind:
What's the most pressing issue or priority? Capture the top concerns or focus areas that need immediate attention.

Updates and Wins:
Highlight recent achievements and progress. What's going well? Document key updates that show momentum.

Challenges and Blockers:
What obstacles are in the way? Note any blockers that are slowing progress.

Mutual Feedback:
Did they give me any feedback on what I could do differently? Is there anything I should change about our team to make us more successful? Did I share any feedback for them? List it all here, attributing who gave the feedback.

Next Milestone:
Define clear action items and next steps. Who's doing what by when? Ensure accountability and follow-up.

Final Check: Before generating the summary, ensure it directly addresses each section, is free of conversational filler, and serves as a clear record for tracking progress and accountability between this meeting and the next.`,
  },
  {
    name: 'Stand Up',
    content: `Meeting Type: Daily Stand-up Meeting

Meeting Goal: The goal is to document each participant's updates regarding their recent accomplishments, current focus, and any blockers they are facing. Keep these notes short and to-the-point.

Output Sections:

Announcements:
Include any note-worthy points from the small-talk or announcements at the beginning of the call.

Updates:
Break these down into what was achieved yesterday, or accomplishments, what each person is working on today and highlight any blockers that could impact progress.

Sidebar:
Summarize any further discussions or issues that were explored after the main updates. Note any collaborative efforts, decisions made, or additional points raised.

Action Items:
Document and assign next steps from the meeting, summarize immediate tasks, provide reminders, and ensure accountability and clarity on responsibilities.

Final Check: Before finalizing, ensure the summary is scannable and that all key updates, blockers, and action items are clearly captured and attributed according to the structure above.`,
  },
  {
    name: 'Team Meeting',
    content: `Meeting Type: Weekly Team Meeting

Meeting Goal: I met with my team to assess our project's health and align our efforts. My aim was to gain a clear understanding of our progress, address any emerging challenges, and ensure each team member is clear on their role in advancing our goals.

Output Sections:

Announcements: Note here any significant announcements made, whether they relate to professional and company-wide updates, or important events in the personal lives of my colleagues.

Review of Progress: Capture the discussion on the team's progress towards the overall strategic goals.

Key Achievements: Summarize the notable achievements and results shared by team members, highlighting significant successes or completed tasks from the past week.

Challenges and Adjustments Needed: Document any challenges the team is facing, including obstacles that have arisen. Note any adjustments or changes in strategy that were discussed to overcome these challenges.

Action Items and Accountability for the Week Ahead: Record the action items assigned for the upcoming week, including who is responsible for each task and any deadlines or accountability measures that were agreed upon.

Final Check: Before generating the final output, review your summary to ensure it is a clear, accurate, and complete reflection of the meeting according to the structure provided. The summary should empower the team to move forward with clarity and purpose.`,
  },
  {
    name: 'Interview',
    content: `Meeting Type: Job Interview

Meeting Goal: I met with a job candidate to assess their suitability for a position within our company.

Output Sections:

Their Background:
Detail the candidate's professional journey, education, and overall career progression. Include information about their current role and responsibilities, as well as any significant achievements or projects they've worked on.

Skills and Experience:
Highlight the specific skills and experiences that are most relevant to the position. Focus on technical abilities, soft skills, and any particular areas of expertise that align with the job requirements.

Motivation and Fit:
Include the candidate's career aspirations and why they're interested in this particular role and company.

Availability and Salary Expectations:
Note down the candidate's current notice period or earliest start date. Include their salary expectations and any other compensation-related questions.

Next Steps:
Write here any subsequent stages in the hiring process that I mention. Include any considerations regarding the candidate's availability or timelines that they mention.

Final Check: Before completing the summary, ensure that all information is accurately placed in the correct section and that the output provides a clear, comprehensive overview of the candidate based only on the information discussed in the interview.`,
  },
];
