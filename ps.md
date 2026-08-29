Ideathon Challenge: Build a Secure "Personal Gemini Journal"

The Challenge

Most AI-generated apps look great in a demo and fall apart in production — hardcoded keys, no auth boundaries, shared databases with zero isolation. Your challenge: configure Google AI Studio to think like a security engineer before it writes a single line of code, then use it to ship a real, production-grade application.
You'll set this up as a foundational step, then build the Personal Gemini Journal — an authenticated web app where users sign in, brainstorm or journal with Gemini, and have their conversations automatically summarized and saved.

Detail Briefing
Phase 1:
Configure Google AI Studio with Custom Instructions that bake in enterprise-grade production directives — threat modeling, secure coding standards, database isolation rules, and proper secret management. This becomes your studio's "constitution" for every build that follows.
Phase 2:
Using your newly configured AI Studio, build a web app that includes

User Authentication
Sign-in via Firebase
Multi-turn AI Interaction
Real conversations with the Gemini API for brainstorming/journaling
Isolated Data Storage
Each user's summaries/logs persist to Cloud Firestore — with zero cross-user leakage
Secure Key Management
API keys retrieved via Google Cloud Secret Manager, never hardcoded

Phase 3:
Ship at least one original feature enhancement, built using Google AI Studio, that goes beyond the base spec.

Deliverables

    ✅ Your configured Google AI Studio setup with custom security directives
    ✅ A working Personal Gemini Journal app meeting all four core requirements above
    ✅ One or more unique feature enhancements you designed and built