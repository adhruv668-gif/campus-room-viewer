# 5-Minute Video Presentation Script
> **Course:** LPU CSE326 Web Development (CA1 Assessment)  
> **Team SOUL:** Angel Seth (12611041), Kartik (12612598), Dhruv Anand (12619773)  
> **Project:** Campus Room & Lab Availability Viewer  
> **Total Duration:** 5:30 (Speaking turns split equally)

---

## Speaking Breakdown

### Segment 1: Introduction & Architecture (0:00 – 1:15)
**Speaker: Angel Seth (Reg. No: 12611041)**
- Introduce Team SOUL and the project title.
- State the problem: difficulty finding vacant rooms across academic blocks between lectures.
- State the objective: responsive web portal for room availability and booking requests.
- Overview of technologies: 100% vanilla HTML5, CSS3, and ES6 JavaScript with zero external frameworks or libraries.
- Demonstrate responsive layout, accessible dialog modals, and dark/light theme switching.

### Segment 2: Timetable Explorer & Conflict Engine (1:15 – 2:45)
**Speaker: Kartik (Reg. No: 12612598)**
- Demonstrate the Availability Explorer: 28 rooms across 4 academic blocks for Slots 1 to 9 (09:00–18:00).
- Explain the slot color coding (Free, Class, Booked, Requested, Maintenance).
- Demonstrate the Room Finder filtering by capacity and amenities (Projector, AC).
- Walk through the booking form: 8-digit student ID check, consecutive slot caps (2 for students, 4 for faculty).
- Explain the conflict detection algorithm: $(s1 \le e2) \land (s2 \le e1)$ preventing double-booking against classes and approved reservations.

### Segment 3: Admin Management & Persistence (2:45 – 4:15)
**Speaker: Dhruv Anand (Reg. No: 12619773)**
- Switch role to Admin using PIN `1234` to demonstrate role simulation.
- Demonstrate the approval cascade: approving one request automatically rejects overlapping pending requests.
- Demonstrate maintenance mode: placing a room under maintenance auto-cancels upcoming reservations with an audit note.
- Explain the persistence layer: versioned LocalStorage wrapper with memory fallback, JSON backup, and Excel CSV export.

### Segment 4: Outcomes & Conclusion (4:15 – 5:30)
**Speakers: All Members (Angel Seth, Kartik, Dhruv Anand)**
- Angel Seth: Summarize fulfillment of all mandatory functional requirements.
- Kartik: Highlight core lessons learned (hash routing, event delegation, timezone-safe date math).
- Dhruv Anand: Conclude with GitHub repository and live deployment links. Thank the evaluators.
