import type { PromptTemplate } from '../types/index.js';

// Dictation styling prompt
export const DEFAULT_DICTATION_STYLING_PROMPT = `Clean and format this dictated text:

1. Remove filler words (um, uh, like, you know), stutters, and false starts
2. Fix grammar, spelling, and punctuation
3. Use contractions naturally (it's, don't, can't)
4. Keep as a single paragraph - no line breaks
5. Preserve the original meaning exactly

Output plain text only.`;

// Summarization system prompt
export const SUMMARIZATION_SYSTEM_PROMPT = `You are an expert meeting summarizer. Transform transcripts into clear, actionable notes.

Rules:
1. Use ONLY the sections provided below - don't add or rename sections
2. Be concise - use bullet points, not paragraphs
3. Extract action items with: Task - Owner - Due date
4. Stay objective - report what was said, include disagreements
5. Focus on decisions, blockers, and next steps

Key phrases to capture: "decided to", "will handle", "blocker is", "next step", "action item", "by [date]", "assigned to"

Meeting Context and Structure:
`;

// Default meeting prompt templates
export const DEFAULT_PROMPTS: PromptTemplate[] = [
  {
    name: 'Default',
    content: '',
  },
  {
    name: '1 on 1',
    content: `1:1 Meeting Notes

Sections:
- Top Priority: Most urgent issue discussed
- Updates & Wins: Recent progress and achievements
- Blockers: Obstacles preventing progress
- Feedback: Key feedback exchanged (attribute to speaker)
- Action Items: Tasks with owner and deadline`,
  },
  {
    name: 'Stand Up',
    content: `Daily Standup Notes

Sections:
- Announcements: Team-wide updates
- Updates by Person:
  • Yesterday: Completed
  • Today: Working on
  • Blockers: Impediments
- Action Items: Tasks assigned with owners`,
  },
  {
    name: 'Team Meeting',
    content: `Team Meeting Notes

Sections:
- Announcements: Company/team news
- Progress: Status of goals and projects
- Wins: Notable achievements
- Challenges: Obstacles and proposed solutions
- Action Items: Tasks with owner and deadline`,
  },
  {
    name: 'Interview',
    content: `Interview Notes

Sections:
- Background: Experience, education, current role
- Skills: Technical and soft skills relevant to position
- Motivation: Why this role/company, career goals
- Logistics: Notice period, salary expectations, location
- Next Steps: Follow-up actions and timeline`,
  },
  {
    name: 'Brainstorm',
    content: `Brainstorm Session Notes

Sections:
- Problem Statement: What we're solving
- Ideas Generated: All ideas discussed (don't filter)
- Top Candidates: Ideas with most support
- Concerns Raised: Risks or challenges identified
- Next Steps: How to evaluate or proceed`,
  },
  {
    name: 'Project Kickoff',
    content: `Project Kickoff Notes

Sections:
- Objectives: Goals and success criteria
- Scope: What's included and excluded
- Timeline: Key milestones and deadlines
- Roles: Team members and responsibilities
- Risks: Potential issues identified
- Action Items: Immediate next steps with owners`,
  },
];
