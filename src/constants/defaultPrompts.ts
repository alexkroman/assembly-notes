import type { PromptTemplate } from '../types/index.js';

export const DEFAULT_PROMPTS: PromptTemplate[] = [
  {
    name: 'Default',
    content: '',
  },
  {
    name: '1 on 1',
    content: `Meeting Type: 1:1 Meeting

Generate concise, actionable notes focused on priorities and next steps.

Output Sections:

Top of Mind:
The most urgent issue or priority discussed.

Updates and Wins:
Recent achievements and positive progress.

Challenges and Blockers:
Current obstacles preventing progress.

Feedback Exchange:
Any feedback given or received by either party. Clearly attribute who said what.

Action Items:
Specific tasks with owners and deadlines.

Keep notes brief, direct, and ready for follow-up.`,
  },
  {
    name: 'Stand Up',
    content: `Meeting Type: Daily Stand-up

Capture brief updates from each participant.

Output Sections:

Announcements:
Any team-wide updates or important news shared.

Individual Updates:
For each person:
- Yesterday: What they completed
- Today: What they're working on
- Blockers: Any impediments

Follow-up Discussions:
Any deeper dives or decisions made after the main updates.

Action Items:
Tasks assigned with owners.

Keep entries short and scannable.`,
  },
  {
    name: 'Team Meeting',
    content: `Meeting Type: Team Meeting

Document team alignment, progress, and planning.

Output Sections:

Announcements:
Company updates, team news, or important events.

Progress Review:
Status of team goals and projects.

Key Achievements:
Notable wins and completed work since last meeting.

Challenges:
Current obstacles and proposed solutions.

Action Items:
Tasks for the week ahead with owners and deadlines.

Focus on clarity and accountability.`,
  },
  {
    name: 'Interview',
    content: `Meeting Type: Job Interview

Assess candidate fit for the role.

Output Sections:

Background:
Professional experience, education, current role, and key achievements.

Relevant Skills:
Technical abilities and soft skills that match the position requirements.

Motivation:
Why they want this role and company. Career goals.

Logistics:
- Notice period/start date
- Salary expectations
- Location/remote preferences

Next Steps:
Follow-up actions and timeline discussed.

Capture only what was actually discussed.`,
  },
];
