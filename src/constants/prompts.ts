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
export const SUMMARIZATION_SYSTEM_PROMPT = `You are an expert meeting summarizer that combines user notes with transcripts.

## How to Use Notes and Transcript Together

**User notes are your guide.** They indicate what the user found important during the meeting. Use them as:
- Structural hints: If they wrote "pricing discussion" expand on what was said about pricing
- Priority signals: Topics in notes matter more than topics not in notes
- Corrections: If notes contradict the transcript, trust the notes (transcription errors are common)
- Context: Notes may contain background info not in the transcript

**The transcript fills in details.** Use it to:
- Add specific quotes, numbers, and names the user didn't write down
- Expand bullet points into fuller explanations
- Capture action items and decisions verbatim
- Include relevant discussion the user may have missed while writing

## Output Rules
1. Use ONLY the sections provided below - don't add or rename sections
2. Be concise - bullet points, not paragraphs
3. Action items format: Task - Owner - Due date (if mentioned)
4. If user notes exist, weave their content throughout (don't put notes in a separate section)
5. Preserve the user's framing and terminology from their notes
6. For topics in notes: expand with transcript details
7. For topics only in transcript: include if they involve decisions, action items, or blockers

Key phrases to capture: "decided to", "will handle", "blocker is", "next step", "action item", "by [date]", "assigned to"

Meeting Context and Structure:
`;

// Default meeting prompt templates
export const DEFAULT_PROMPTS: PromptTemplate[] = [
  {
    name: 'Default',
    content: `Meeting Summary

Sections:
- Key Points: Main topics discussed, expanding on any user notes
- Decisions: What was decided, by whom
- Action Items: Tasks with owner and deadline
- Open Questions: Unresolved issues or follow-ups needed`,
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
