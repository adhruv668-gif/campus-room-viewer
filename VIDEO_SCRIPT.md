# 5–6 Minute Video Presentation & Demo Script
> **Course:** LPU CSE326 Web Development (CA1 Assessment — 5 Video Marks)  
> **Team SOUL:** Angel Seth (12401231), Kartik (12401232), Dhruv Anand (12401233)  
> **Project:** Campus Room & Lab Availability Viewer  
> **Total Duration:** Exactly 5 Minutes 30 Seconds (All 3 members speak equally)

---

## Recording Checklist Before Starting
- [ ] Browser window open to: `https://adhruv668-gif.github.io/campus-room-viewer/`
- [ ] Screen resolution set to 1920x1080 (1080p).
- [ ] Browser zoom level set to 100% or 110% for crisp readability.
- [ ] Clean microphone test with all three team members present.
- [ ] All three members must show their faces or speak clearly with their registration numbers introduced.

---

## Timestamp Breakdown & Script

```
0:00 - 1:10 : Angel Seth   (Introduction, Problem Statement, Objectives, UI & Architecture)
1:10 - 2:40 : Kartik       (Core Timetable Explorer, Slot Precedence, Live Booking & Conflict Engine)
2:40 - 4:10 : Dhruv Anand  (Admin Portal, Auto-Reject Cascades, Maintenance Safeguards, Data Tools)
4:10 - 5:30 : All Members  (Outcomes, Key Learnings, viva summary & conclusion)
```

---

### Segment 1: Introduction & Architecture (0:00 – 1:10)
**Speaker:** **Angel Seth (Reg. No: 12401231)**  
*On Screen: Starting on `#dashboard` view.*

> **Angel Seth speaks:**  
> "Good day everyone and respected faculty members. We are Team SOUL from 1st Year B.Tech Computer Science and Engineering at Lovely Professional University. I am Angel Seth, and with me are my teammates Kartik and Dhruv Anand.
>
> Today we present our CSE326 CA1 Problem Statement-Based Project: the **Campus Room & Lab Availability Viewer**.
>
> **The Problem:** In a sprawling university campus like LPU, students and faculty often do not know which classrooms, seminar halls, or computer labs are vacant between scheduled lectures. This leads to time wasted physically walking across academic blocks to find an open room for study sessions or department meetings.
>
> **Our Solution:** We engineered a 100% responsive, client-side web portal that tracks real-time occupancy across 28 campus rooms and 4 academic blocks for all 9 daily teaching hours.
>
> **Architecture & UI:** The entire project is built using pure HTML5, vanilla CSS3, and ES6 JavaScript. We used zero external libraries, zero frameworks, and zero CDNs. As you can see on screen, our interface features an accessible design with contrast ratios exceeding WCAG AA standards, instant dark-and-light theme switching, and fluid layouts that work on mobile phones down to 360 pixels.
>
> I will now hand over to Kartik to demonstrate our timetable explorer and conflict detection engine."

---

### Segment 2: Timetable Explorer, Room Finder & Conflict Engine (1:10 – 2:40)
**Speaker:** **Kartik (Reg. No: 12401232)**  
*On Screen: Navigates to `#/availability`, then `#/find`, then `#/request`.*

> **Kartik speaks:**  
> "Thank you, Angel. I am Kartik, and I will demonstrate how our system solves the room discovery and reservation workflow.
>
> *[Clicks on 'Availability' tab in navigation]*
>
> Here in the **Availability Explorer**, users see our 9-slot daily schedule from 09:00 to 18:00. Rooms are grouped under Block 32, Block 34, Block 38, and the Tech Center. Notice our color-coded badges:
> - Green for Free,
> - Blue for scheduled University Classes,
> - Purple for Approved Bookings,
> - Orange for Pending Requests, and
> - Striped Gray for Maintenance.
>
> Users can filter dynamically by building, room type, or minimum seating capacity, and our live search bar filters results instantly using debounced JavaScript input handlers.
>
> *[Clicks on 'Find a Room' tab]*
>
> If a student needs a room with specific amenities—for example, a room for 40 attendees with a Projector and AC in Slot 3—our **Room Finder** scans all active rooms and presents the best matches with a 1-click 'Reserve' button.
>
> *[Clicks 'Reserve' & demonstrates form validation]*
>
> In the **Booking Form**, our validation engine enforces strict university policies:
> - Students are validated with exactly 8-digit registration numbers and capped at 2 consecutive slots.
> - Faculty are allowed up to 4 consecutive slots.
> - Past slots earlier today are automatically blocked.
>
> Most importantly, our core **Conflict Detection Algorithm** checks the mathematical range condition $(s1 \le e2) \land (s2 \le e1)$. If a lecture or approved booking already occupies the slot, the system flags a hard conflict and disables submission.
>
> Now, Dhruv will demonstrate the Coordinator Admin Portal and data persistence layer."

---

### Segment 3: Admin Management, Approval Cascades & Persistence (2:40 – 4:10)
**Speaker:** **Dhruv Anand (Reg. No: 12401233)**  
*On Screen: Switches role to 'Admin', enters PIN 1234, navigates to `#/admin` and `#/requests`.*

> **Dhruv Anand speaks:**  
> "Thank you, Kartik. I am Dhruv Anand, and I will demonstrate our administrative controls and data layer.
>
> *[Clicks role dropdown, selects Admin, enters PIN 1234 in modal]*
>
> To simulate coordinator access, the portal features an Admin mode protected by a 4-digit PIN. Once unlocked, the **Admin Portal** opens.
>
> *[Navigates to '#/requests']*
>
> Here in the **Requests Tracker**, coordinators can review submitted bookings. Watch what happens when I approve a booking:
>
> *[Clicks Approve on a pending request]*
>
> Notice that when this request is approved, our system automatically runs an **Approval Cascade**. Any competing pending request for that exact room and time slot is instantly transitioned to `Rejected` with an audit note: *'Slot allotted to request RB-...'*.
>
> *[Navigates to '#/admin' -> Rooms tab]*
>
> In **Room Management**, coordinators can mark rooms under maintenance. When Room 101 is put under maintenance, the system checks for any future reservations and automatically cancels them to prevent students from walking into a closed room.
>
> *[Scrolls to footer or Data tab]*
>
> **Data Persistence:** All buildings, rooms, timetables, and booking audit trails persist in browser `localStorage` as structured JSON with schema versioning. We also provide full JSON backup export, UTF-8 CSV reports for Microsoft Excel, and a one-click sample data reset.
>
> If local storage is disabled by browser privacy settings, our storage layer falls back to an in-memory dictionary so the application never crashes."

---

### Segment 4: Project Outcomes & Conclusion (4:10 – 5:30)
**Speakers:** **All Three Members (Angel Seth, Kartik, Dhruv Anand)**  
*On Screen: Shows Dashboard KPI overview, GitHub repo, and deployed GitHub Pages link.*

> **Angel Seth speaks (4:10 – 4:35):**  
> "To conclude, our portal fulfills 100% of the assigned LPU CSE326 requirements:
> - A fully responsive web interface with zero CSS or JS libraries,
> - Structured input validation with clear feedback,
> - Real-time occupancy tracking, and
> - Live visual summary dashboards."
>
> **Kartik speaks (4:35 – 5:00):**  
> "Through this project, we mastered fundamental web development principles:
> - Client-side hash routing without page refreshes,
> - Resilient event delegation,
> - Timezone-safe local date math for Indian Standard Time (UTC+05:30), and
> - Algorithmic slot collision resolution."
>
> **Dhruv Anand speaks (5:00 – 5:30):**  
> "The entire source code is hosted publicly on GitHub at `github.com/adhruv668-gif/campus-room-viewer`, and deployed live on GitHub Pages at `adhruv668-gif.github.io/campus-room-viewer/`.
>
> We thank our course instructor and Lovely Professional University for this learning opportunity. Team SOUL is now ready for questions and live code modifications in the viva. Thank you!"

---

## Post-Recording Check
1. Verify video length is between **5:00 and 6:00 minutes**.
2. Verify audio clarity on all three speakers.
3. Upload to Google Drive / YouTube (Unlisted) and paste link into your LPU assessment submission portal.
