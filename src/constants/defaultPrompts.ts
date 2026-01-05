import type { PromptTemplate } from '../types/index.js';

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
