/**
 * js/seed.js
 * 
 * Purpose: Deterministic sample data generator populating 4 buildings, 28 rooms,
 *          weekly academic timetables, and 16 relative booking requests.
 * Owner: Dhruv Anand (Reg. No. 12619773) - Deterministic Sample Data Generator
 * Depends on: Config (js/config.js), Utils (js/utils.js)
 * 
 * Functions:
 * - generateSampleData(): object - Returns full initial dataset for the application.
 */

'use strict';

const Seed = {
  /**
   * Generates the entire initial database deterministically without Math.random.
   * @returns {{ buildings: object[], rooms: object[], timetable: object[], bookings: object[], settings: object }}
   */
  generateSampleData: function() {
    const buildings = this._createBuildings();
    const rooms = this._createRooms();
    const timetable = this._createTimetable(rooms);
    const bookings = this._createBookings(rooms, timetable);
    const settings = this._createDefaultSettings();

    return {
      buildings: buildings,
      rooms: rooms,
      timetable: timetable,
      bookings: bookings,
      settings: settings
    };
  },

  /**
   * 4 Academic Campus Buildings.
   */
  _createBuildings: function() {
    return [
      { id: 'b32', code: 'B32', name: 'Block 32 - Academic Block', floors: 4 },
      { id: 'b33', code: 'B33', name: 'Block 33 - Computer Science Block', floors: 5 },
      { id: 'b34', code: 'B34', name: 'Block 34 - Engineering Block', floors: 4 },
      { id: 'blab', code: 'BLAB', name: 'Lab Complex - Central Laboratories', floors: 3 }
    ];
  },

  /**
   * 28 Rooms across 4 types. Exactly 1 room is under Maintenance (room-33-205).
   */
  _createRooms: function() {
    return [
      // Block 32: 8 rooms (Classrooms & Seminar Room)
      { id: 'room-32-101', buildingId: 'b32', roomNo: '101', name: 'Smart Classroom 101', floor: 1, type: 'Classroom', capacity: 60, facilities: ['Projector', 'Smart Board', 'Wi-Fi', 'Whiteboard'], status: 'Active', notes: 'Ground floor lecture hall with smart board.' },
      { id: 'room-32-102', buildingId: 'b32', roomNo: '102', name: 'Smart Classroom 102', floor: 1, type: 'Classroom', capacity: 60, facilities: ['Projector', 'Wi-Fi', 'Whiteboard', 'AC'], status: 'Active', notes: 'Air conditioned classroom.' },
      { id: 'room-32-201', buildingId: 'b32', roomNo: '201', name: 'Standard Classroom 201', floor: 2, type: 'Classroom', capacity: 50, facilities: ['Whiteboard', 'Wi-Fi'], status: 'Active', notes: 'Standard tutorial room.' },
      { id: 'room-32-202', buildingId: 'b32', roomNo: '202', name: 'Standard Classroom 202', floor: 2, type: 'Classroom', capacity: 50, facilities: ['Whiteboard', 'Projector', 'Wi-Fi'], status: 'Active', notes: 'Second floor lecture room.' },
      { id: 'room-32-301', buildingId: 'b32', roomNo: '301', name: 'Large Lecture Hall 301', floor: 3, type: 'Classroom', capacity: 120, facilities: ['Projector', 'Mic & Speakers', 'AC', 'Power Backup', 'Wi-Fi'], status: 'Active', notes: 'Tiered auditorium seating.' },
      { id: 'room-32-302', buildingId: 'b32', roomNo: '302', name: 'Lecture Hall 302', floor: 3, type: 'Classroom', capacity: 80, facilities: ['Projector', 'AC', 'Wi-Fi'], status: 'Active', notes: 'Medium tiered lecture room.' },
      { id: 'room-32-401', buildingId: 'b32', roomNo: '401', name: 'Executive Seminar Room 401', floor: 4, type: 'Seminar Room', capacity: 70, facilities: ['Projector', 'Smart Board', 'AC', 'Mic & Speakers', 'Wi-Fi', 'Power Backup'], status: 'Active', notes: 'Audio-visual seminar hall for conferences.' },
      { id: 'room-32-402', buildingId: 'b32', roomNo: '402', name: 'Classroom 402', floor: 4, type: 'Classroom', capacity: 45, facilities: ['Whiteboard', 'Wi-Fi'], status: 'Active', notes: 'Quiet top floor classroom.' },

      // Block 33: 8 rooms (Computer Labs & Classrooms)
      { id: 'room-33-101', buildingId: 'b33', roomNo: '101', name: 'Computer Lab 101', floor: 1, type: 'Computer Lab', capacity: 40, facilities: ['PCs', 'Projector', 'AC', 'Wi-Fi', 'Power Backup'], status: 'Active', notes: 'High-performance workstations for programming.' },
      { id: 'room-33-102', buildingId: 'b33', roomNo: '102', name: 'Computer Lab 102', floor: 1, type: 'Computer Lab', capacity: 40, facilities: ['PCs', 'AC', 'Wi-Fi', 'Whiteboard'], status: 'Active', notes: 'General computing lab.' },
      { id: 'room-33-201', buildingId: 'b33', roomNo: '201', name: 'AI & Data Science Lab 201', floor: 2, type: 'Computer Lab', capacity: 50, facilities: ['PCs', 'Smart Board', 'AC', 'Wi-Fi', 'Power Backup'], status: 'Active', notes: 'GPU-equipped lab for machine learning classes.' },
      { id: 'room-33-205', buildingId: 'b33', roomNo: '205', name: 'Computer Lab 205 (Networking)', floor: 2, type: 'Computer Lab', capacity: 35, facilities: ['PCs', 'AC', 'Wi-Fi'], status: 'Maintenance', notes: 'Under scheduled network switch upgrade.' },
      { id: 'room-33-301', buildingId: 'b33', roomNo: '301', name: 'Classroom 301', floor: 3, type: 'Classroom', capacity: 60, facilities: ['Projector', 'Whiteboard', 'Wi-Fi'], status: 'Active', notes: 'CSE theory classroom.' },
      { id: 'room-33-302', buildingId: 'b33', roomNo: '302', name: 'Classroom 302', floor: 3, type: 'Classroom', capacity: 60, facilities: ['Projector', 'AC', 'Wi-Fi', 'Whiteboard'], status: 'Active', notes: 'CSE tutorial classroom.' },
      { id: 'room-33-401', buildingId: 'b33', roomNo: '401', name: 'Seminar Hall 401', floor: 4, type: 'Seminar Room', capacity: 80, facilities: ['Projector', 'Mic & Speakers', 'AC', 'Wi-Fi', 'Power Backup'], status: 'Active', notes: 'Department seminar room.' },
      { id: 'room-33-501', buildingId: 'b33', roomNo: '501', name: 'Cyber Security Lab 501', floor: 5, type: 'Computer Lab', capacity: 30, facilities: ['PCs', 'AC', 'Wi-Fi', 'Power Backup'], status: 'Active', notes: 'Dedicated security testing lab.' },

      // Block 34: 6 rooms (Engineering & Classrooms)
      { id: 'room-34-101', buildingId: 'b34', roomNo: '101', name: 'Engineering Drawing Hall 101', floor: 1, type: 'Classroom', capacity: 90, facilities: ['Projector', 'Whiteboard', 'Wi-Fi'], status: 'Active', notes: 'Equipped with drafting tables.' },
      { id: 'room-34-102', buildingId: 'b34', roomNo: '102', name: 'Robotics Workshop 102', floor: 1, type: 'Science/Engineering Lab', capacity: 35, facilities: ['Power Backup', 'Wi-Fi', 'AC'], status: 'Active', notes: 'Mechanical robotics lab.' },
      { id: 'room-34-201', buildingId: 'b34', roomNo: '201', name: 'Classroom 201', floor: 2, type: 'Classroom', capacity: 55, facilities: ['Projector', 'Whiteboard', 'Wi-Fi'], status: 'Active', notes: 'Engineering mathematics classroom.' },
      { id: 'room-34-202', buildingId: 'b34', roomNo: '202', name: 'Classroom 202', floor: 2, type: 'Classroom', capacity: 55, facilities: ['Whiteboard', 'Wi-Fi'], status: 'Active', notes: 'Core branch lecture room.' },
      { id: 'room-34-301', buildingId: 'b34', roomNo: '301', name: 'Mechatronics Lab 301', floor: 3, type: 'Science/Engineering Lab', capacity: 40, facilities: ['PCs', 'Power Backup', 'Wi-Fi', 'AC'], status: 'Active', notes: 'PLC and automation test benches.' },
      { id: 'room-34-401', buildingId: 'b34', roomNo: '401', name: 'Seminar Hall 401', floor: 4, type: 'Seminar Room', capacity: 60, facilities: ['Projector', 'Smart Board', 'AC', 'Mic & Speakers'], status: 'Active', notes: 'Mini auditorium.' },

      // Lab Complex: 6 rooms (Specialized Labs & Seminars)
      { id: 'room-lab-101', buildingId: 'blab', roomNo: 'L101', name: 'Physics Optics Lab', floor: 1, type: 'Science/Engineering Lab', capacity: 30, facilities: ['Power Backup', 'AC'], status: 'Active', notes: 'Dark room and optical benches.' },
      { id: 'room-lab-102', buildingId: 'blab', roomNo: 'L102', name: 'Chemistry Research Lab', floor: 1, type: 'Science/Engineering Lab', capacity: 25, facilities: ['Power Backup'], status: 'Active', notes: 'Fume hoods and titration stations.' },
      { id: 'room-lab-201', buildingId: 'blab', roomNo: 'L201', name: 'Digital Electronics Lab', floor: 2, type: 'Science/Engineering Lab', capacity: 35, facilities: ['Power Backup', 'AC', 'Wi-Fi'], status: 'Active', notes: 'Oscilloscopes and breadboard kits.' },
      { id: 'room-lab-202', buildingId: 'blab', roomNo: 'L202', name: 'Cloud Computing Lab', floor: 2, type: 'Computer Lab', capacity: 60, facilities: ['PCs', 'Smart Board', 'AC', 'Wi-Fi', 'Power Backup'], status: 'Active', notes: 'Virtualization and cloud terminal lab.' },
      { id: 'room-lab-301', buildingId: 'blab', roomNo: 'L301', name: 'Central Conference Hall', floor: 3, type: 'Seminar Room', capacity: 80, facilities: ['Projector', 'Smart Board', 'AC', 'Mic & Speakers', 'Wi-Fi', 'Power Backup'], status: 'Active', notes: 'Campus-wide research presentation hall.' },
      { id: 'room-lab-302', buildingId: 'blab', roomNo: 'L302', name: 'Innovation Hub Seminar Room', floor: 3, type: 'Seminar Room', capacity: 50, facilities: ['Projector', 'AC', 'Wi-Fi', 'Whiteboard'], status: 'Active', notes: 'Hackathon discussion space.' }
    ];
  },

  /**
   * Generates weekly timetable deterministically (no Math.random).
   * ~55% occupied slots 1-5, ~30% occupied slots 6-9, Mon-Sat.
   */
  _createTimetable: function(rooms) {
    const timetable = [];
    const courses = [
      'CSE326 Web Technology',
      'CSE111 Python Programming',
      'INT213 Data Structures',
      'MEC101 Engineering Graphics',
      'PHY102 Applied Physics',
      'ECE201 Digital Electronics',
      'CSE316 Operating Systems',
      'CSE205 OOP with Java',
      'MTH108 Differential Equations',
      'CHE110 Environmental Studies'
    ];

    const faculties = [
      'Dr. Rajesh Sharma',
      'Prof. Sunita Verma',
      'Dr. Amit Roy',
      'Prof. Neha Gupta',
      'Dr. Vikram Seth',
      'Prof. Ananya Sen',
      'Dr. Harpreet Singh',
      'Prof. Meenakshi Sundaram'
    ];

    const sections = ['K23AB', 'K23CD', 'K23EF', 'K23GH', 'K23IJ', 'K23KL'];

    // Deterministic pseudo-hash formula: (roomIdx * 11 + day * 13 + slot * 17) % 100
    for (let r = 0; r < rooms.length; r++) {
      const room = rooms[r];
      if (room.status === 'Maintenance') continue;

      for (let day = 1; day <= 6; day++) { // Mon to Sat
        for (let slot = 1; slot <= 9; slot++) {
          const pseudoHash = (r * 11 + day * 13 + slot * 17) % 100;
          const isMorningSlot = slot <= 5;
          const threshold = isMorningSlot ? 55 : 30;

          if (pseudoHash < threshold) {
            const courseIdx = (r + day + slot) % courses.length;
            const facultyIdx = (r * 2 + day + slot) % faculties.length;
            const sectionIdx = (r + slot) % sections.length;

            timetable.push({
              id: `tt-${room.id}-${day}-${slot}`,
              roomId: room.id,
              weekday: day,
              slot: slot,
              course: courses[courseIdx],
              faculty: faculties[facultyIdx],
              section: sections[sectionIdx]
            });
          }
        }
      }
    }

    return timetable;
  },

  /**
   * Helper to compute ISO local date string offset from today.
   */
  _getOffsetDateStr: function(offsetDays) {
    const now = Utils.getNow();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);
    return Utils.getLocalDateString(target);
  },

  /**
   * Creates 16 sample bookings relative to current date.
   */
  _createBookings: function(rooms, timetable) {
    const todayStr = this._getOffsetDateStr(0);
    const yesterdayStr = this._getOffsetDateStr(-1);
    const tomorrowStr = this._getOffsetDateStr(1);
    const day2Str = this._getOffsetDateStr(2);
    const day3Str = this._getOffsetDateStr(3);
    const day4Str = this._getOffsetDateStr(4);
    const day7Str = this._getOffsetDateStr(7);

    const nowIso = Utils.getNow().toISOString();

    // Helper to ensure an approved booking does not clash with timetable
    const removeTimetableClash = function(roomId, dateStr, startSlot, endSlot) {
      const weekday = Utils.getWeekday(dateStr);
      for (let i = timetable.length - 1; i >= 0; i--) {
        const tt = timetable[i];
        if (tt.roomId === roomId && tt.weekday === weekday && tt.slot >= startSlot && tt.slot <= endSlot) {
          timetable.splice(i, 1);
        }
      }
    };

    // Ensure our sample Approved slots are free of class clashes
    removeTimetableClash('room-32-101', yesterdayStr, 2, 2);
    removeTimetableClash('room-32-101', todayStr, 7, 7);
    removeTimetableClash('room-32-401', todayStr, 4, 5);
    removeTimetableClash('room-33-101', tomorrowStr, 2, 2);
    removeTimetableClash('room-34-201', tomorrowStr, 6, 6);
    removeTimetableClash('room-lab-301', day7Str, 3, 4);

    return [
      // --- 5 PENDING REQUESTS ---
      // 3 Competing requests on room-32-101 for Day+2, Slot 3 (demonstrates auto-reject)
      {
        id: 'bk-pend-001',
        ref: 'RB-' + day2Str.replace(/-/g, '') + '-101',
        roomId: 'room-32-101',
        date: day2Str,
        startSlot: 3,
        endSlot: 3,
        purpose: 'Coding Club React workshop and peer review.',
        attendees: 35,
        requesterName: 'Angel Seth',
        requesterId: '12611041',
        requesterType: 'Student',
        email: 'angel.12611041@campus.edu',
        phone: '9876543210',
        requirements: ['Projector', 'Wi-Fi'],
        status: 'Pending',
        adminNote: '',
        createdAt: nowIso,
        updatedAt: nowIso,
        history: [{ status: 'Pending', at: nowIso, by: 'Student', note: 'Submitted booking request.' }]
      },
      {
        id: 'bk-pend-002',
        ref: 'RB-' + day2Str.replace(/-/g, '') + '-102',
        roomId: 'room-32-101',
        date: day2Str,
        startSlot: 3,
        endSlot: 3,
        purpose: 'Guest speaker session on Cloud Architecture.',
        attendees: 45,
        requesterName: 'Dr. Priya Patel',
        requesterId: 'FAC8821',
        requesterType: 'Faculty',
        email: 'priya.patel@campus.edu',
        phone: '9876543220',
        requirements: ['Projector', 'Mic', 'AC on'],
        status: 'Pending',
        adminNote: '',
        createdAt: nowIso,
        updatedAt: nowIso,
        history: [{ status: 'Pending', at: nowIso, by: 'Faculty', note: 'Submitted guest lecture slot request.' }]
      },
      {
        id: 'bk-pend-003',
        ref: 'RB-' + day2Str.replace(/-/g, '') + '-103',
        roomId: 'room-32-101',
        date: day2Str,
        startSlot: 3,
        endSlot: 4,
        purpose: 'Robotics team CAD review and assembly preparation.',
        attendees: 25,
        requesterName: 'Angel Seth',
        requesterId: '12345679',
        requesterType: 'Student',
        email: 'angel.seth@campus.edu',
        phone: '9876543211',
        requirements: ['Projector'],
        status: 'Pending',
        adminNote: '',
        createdAt: nowIso,
        updatedAt: nowIso,
        history: [{ status: 'Pending', at: nowIso, by: 'Student', note: 'Submitted club session request.' }]
      },
      {
        id: 'bk-pend-004',
        ref: 'RB-' + day3Str.replace(/-/g, '') + '-201',
        roomId: 'room-33-201',
        date: day3Str,
        startSlot: 4,
        endSlot: 5,
        purpose: 'Deep Learning model training laboratory session.',
        attendees: 40,
        requesterName: 'Kartik',
        requesterId: '12345680',
        requesterType: 'Student',
        email: 'kartik@campus.edu',
        phone: '9876543212',
        requirements: ['Tech support'],
        status: 'Pending',
        adminNote: '',
        createdAt: nowIso,
        updatedAt: nowIso,
        history: [{ status: 'Pending', at: nowIso, by: 'Student', note: 'Request submitted for GPU lab.' }]
      },
      {
        id: 'bk-pend-005',
        ref: 'RB-' + day4Str.replace(/-/g, '') + '-301',
        roomId: 'room-lab-301',
        date: day4Str,
        startSlot: 6,
        endSlot: 7,
        purpose: 'University Innovation Council faculty orientation.',
        attendees: 60,
        requesterName: 'Dr. Harpreet Singh',
        requesterId: 'FAC4412',
        requesterType: 'Faculty',
        email: 'harpreet.singh@campus.edu',
        phone: '9811223344',
        requirements: ['Projector', 'Mic', 'AC on'],
        status: 'Pending',
        adminNote: '',
        createdAt: nowIso,
        updatedAt: nowIso,
        history: [{ status: 'Pending', at: nowIso, by: 'Faculty', note: 'Meeting slot requested.' }]
      },

      // --- 6 APPROVED BOOKINGS ---
      // Past booking (shows as Completed)
      {
        id: 'bk-appr-001',
        ref: 'RB-' + yesterdayStr.replace(/-/g, '') + '-010',
        roomId: 'room-32-101',
        date: yesterdayStr,
        startSlot: 2,
        endSlot: 2,
        purpose: 'Academic remediation and doubt clearing class.',
        attendees: 20,
        requesterName: 'Dr. Rajesh Sharma',
        requesterId: 'FAC1001',
        requesterType: 'Faculty',
        email: 'rajesh.sharma@campus.edu',
        phone: '9988776655',
        requirements: ['Projector'],
        status: 'Approved',
        adminNote: 'Approved for tutorial.',
        createdAt: nowIso,
        updatedAt: nowIso,
        history: [
          { status: 'Pending', at: nowIso, by: 'Faculty', note: 'Submitted.' },
          { status: 'Approved', at: nowIso, by: 'Admin', note: 'Approved by coordinator.' }
        ]
      },
      // Today: multi-slot booking
      {
        id: 'bk-appr-002',
        ref: 'RB-' + todayStr.replace(/-/g, '') + '-020',
        roomId: 'room-32-401',
        date: todayStr,
        startSlot: 4,
        endSlot: 5,
        purpose: 'Industry expert seminar on Full-Stack Development.',
        attendees: 65,
        requesterName: 'Prof. Sunita Verma',
        requesterId: 'FAC1002',
        requesterType: 'Faculty',
        email: 'sunita.verma@campus.edu',
        phone: '9877112233',
        requirements: ['Projector', 'Mic', 'AC on'],
        status: 'Approved',
        adminNote: 'Auditorium equipment requested.',
        createdAt: nowIso,
        updatedAt: nowIso,
        history: [
          { status: 'Pending', at: nowIso, by: 'Faculty', note: 'Submitted.' },
          { status: 'Approved', at: nowIso, by: 'Admin', note: 'Approved.' }
        ]
      },
      // Today: single-slot booking
      {
        id: 'bk-appr-003',
        ref: 'RB-' + todayStr.replace(/-/g, '') + '-021',
        roomId: 'room-32-101',
        date: todayStr,
        startSlot: 7,
        endSlot: 7,
        purpose: 'Open Source Community monthly developer meetup.',
        attendees: 40,
        requesterName: 'Angel Seth',
        requesterId: '12611041',
        requesterType: 'Student',
        email: 'angel.12611041@campus.edu',
        phone: '9876543210',
        requirements: ['Projector'],
        status: 'Approved',
        adminNote: 'Approved by coordinator.',
        createdAt: nowIso,
        updatedAt: nowIso,
        history: [
          { status: 'Pending', at: nowIso, by: 'Student', note: 'Submitted.' },
          { status: 'Approved', at: nowIso, by: 'Admin', note: 'Approved.' }
        ]
      },
      // Tomorrow: Slot 2
      {
        id: 'bk-appr-004',
        ref: 'RB-' + tomorrowStr.replace(/-/g, '') + '-030',
        roomId: 'room-33-101',
        date: tomorrowStr,
        startSlot: 2,
        endSlot: 2,
        purpose: 'Competitive programming contest practice round.',
        attendees: 35,
        requesterName: 'Angel Seth',
        requesterId: '12345679',
        requesterType: 'Student',
        email: 'angel.seth@campus.edu',
        phone: '9876543211',
        requirements: ['PCs'],
        status: 'Approved',
        adminNote: 'Lab reserved for coding club.',
        createdAt: nowIso,
        updatedAt: nowIso,
        history: [
          { status: 'Pending', at: nowIso, by: 'Student', note: 'Submitted.' },
          { status: 'Approved', at: nowIso, by: 'Admin', note: 'Lab allotted.' }
        ]
      },
      // Tomorrow: Slot 6
      {
        id: 'bk-appr-005',
        ref: 'RB-' + tomorrowStr.replace(/-/g, '') + '-031',
        roomId: 'room-34-201',
        date: tomorrowStr,
        startSlot: 6,
        endSlot: 6,
        purpose: 'Cultural club theater audition preparation.',
        attendees: 30,
        requesterName: 'Kartik',
        requesterId: '12345680',
        requesterType: 'Student',
        email: 'kartik@campus.edu',
        phone: '9876543212',
        requirements: ['Extra chairs'],
        status: 'Approved',
        adminNote: 'Audition space sanctioned.',
        createdAt: nowIso,
        updatedAt: nowIso,
        history: [
          { status: 'Pending', at: nowIso, by: 'Student', note: 'Submitted.' },
          { status: 'Approved', at: nowIso, by: 'Admin', note: 'Approved.' }
        ]
      },
      // Next week: Slot 3-4 multi-slot
      {
        id: 'bk-appr-006',
        ref: 'RB-' + day7Str.replace(/-/g, '') + '-040',
        roomId: 'room-lab-301',
        date: day7Str,
        startSlot: 3,
        endSlot: 4,
        purpose: 'Regional Science & Engineering symposium rehearsal.',
        attendees: 75,
        requesterName: 'Dr. Amit Roy',
        requesterId: 'FAC2014',
        requesterType: 'Faculty',
        email: 'amit.roy@campus.edu',
        phone: '9455667788',
        requirements: ['Projector', 'Mic', 'AC on'],
        status: 'Approved',
        adminNote: 'Auditorium equipment setup confirmed.',
        createdAt: nowIso,
        updatedAt: nowIso,
        history: [
          { status: 'Pending', at: nowIso, by: 'Faculty', note: 'Submitted.' },
          { status: 'Approved', at: nowIso, by: 'Admin', note: 'Symposium sanctioned.' }
        ]
      },

      // --- 2 REJECTED BOOKINGS ---
      {
        id: 'bk-rej-001',
        ref: 'RB-' + tomorrowStr.replace(/-/g, '') + '-051',
        roomId: 'room-32-101',
        date: tomorrowStr,
        startSlot: 1,
        endSlot: 1,
        purpose: 'Project presentation practice group.',
        attendees: 15,
        requesterName: 'Angel Seth',
        requesterId: '12611041',
        requesterType: 'Student',
        email: 'angel.12611041@campus.edu',
        phone: '9876543210',
        requirements: [],
        status: 'Rejected',
        adminNote: 'Slot conflicts with scheduled department morning briefing.',
        createdAt: nowIso,
        updatedAt: nowIso,
        history: [
          { status: 'Pending', at: nowIso, by: 'Student', note: 'Submitted.' },
          { status: 'Rejected', at: nowIso, by: 'Admin', note: 'Slot conflicts with scheduled department morning briefing.' }
        ]
      },
      {
        id: 'bk-rej-002',
        ref: 'RB-' + day2Str.replace(/-/g, '') + '-052',
        roomId: 'room-lab-101',
        date: day2Str,
        startSlot: 4,
        endSlot: 4,
        purpose: 'General student debate meet.',
        attendees: 50,
        requesterName: 'Kartik',
        requesterId: '12345680',
        requesterType: 'Student',
        email: 'kartik@campus.edu',
        phone: '9876543212',
        requirements: [],
        status: 'Rejected',
        adminNote: 'Optics physics lab cannot be used for non-laboratory debate meetings.',
        createdAt: nowIso,
        updatedAt: nowIso,
        history: [
          { status: 'Pending', at: nowIso, by: 'Student', note: 'Submitted.' },
          { status: 'Rejected', at: nowIso, by: 'Admin', note: 'Optics physics lab cannot be used for non-laboratory debate meetings.' }
        ]
      },

      // --- 3 CANCELLED BOOKINGS ---
      {
        id: 'bk-canc-001',
        ref: 'RB-' + tomorrowStr.replace(/-/g, '') + '-061',
        roomId: 'room-32-201',
        date: tomorrowStr,
        startSlot: 5,
        endSlot: 5,
        purpose: 'Self-study and assignment discussion group.',
        attendees: 10,
        requesterName: 'Angel Seth',
        requesterId: '12345679',
        requesterType: 'Student',
        email: 'angel.seth@campus.edu',
        phone: '9876543211',
        requirements: [],
        status: 'Cancelled',
        adminNote: 'Cancelled by user: team members unavailable.',
        createdAt: nowIso,
        updatedAt: nowIso,
        history: [
          { status: 'Pending', at: nowIso, by: 'Student', note: 'Submitted.' },
          { status: 'Cancelled', at: nowIso, by: 'Student', note: 'Cancelled by user: team members unavailable.' }
        ]
      },
      {
        id: 'bk-canc-002',
        ref: 'RB-' + day3Str.replace(/-/g, '') + '-062',
        roomId: 'room-33-301',
        date: day3Str,
        startSlot: 2,
        endSlot: 2,
        purpose: 'Special extra class for algorithms.',
        attendees: 45,
        requesterName: 'Dr. Priya Patel',
        requesterId: 'FAC8821',
        requesterType: 'Faculty',
        email: 'priya.patel@campus.edu',
        phone: '9876543221',
        requirements: ['Projector'],
        status: 'Cancelled',
        adminNote: 'Postponed due to department board meeting.',
        createdAt: nowIso,
        updatedAt: nowIso,
        history: [
          { status: 'Pending', at: nowIso, by: 'Faculty', note: 'Submitted.' },
          { status: 'Cancelled', at: nowIso, by: 'Faculty', note: 'Postponed due to department board meeting.' }
        ]
      },
      {
        id: 'bk-canc-003',
        ref: 'RB-' + day4Str.replace(/-/g, '') + '-063',
        roomId: 'room-34-401',
        date: day4Str,
        startSlot: 6,
        endSlot: 6,
        purpose: 'Quiz competition round 1.',
        attendees: 55,
        requesterName: 'Angel Seth',
        requesterId: '12611041',
        requesterType: 'Student',
        email: 'angel.12611041@campus.edu',
        phone: '9876543210',
        requirements: ['Mic'],
        status: 'Cancelled',
        adminNote: 'Cancelled: venue shifted to central auditorium.',
        createdAt: nowIso,
        updatedAt: nowIso,
        history: [
          { status: 'Pending', at: nowIso, by: 'Student', note: 'Submitted.' },
          { status: 'Cancelled', at: nowIso, by: 'Student', note: 'Cancelled: venue shifted to central auditorium.' }
        ]
      }
    ];
  },

  /**
   * Default initial user and environment settings.
   */
  _createDefaultSettings: function() {
    return {
      role: Config.ROLES.STUDENT,
      theme: 'system',
      adminPin: Config.DEFAULT_PIN,
      lastRequester: {
        type: 'Student',
        name: 'Angel Seth',
        id: '12611041',
        email: 'angel.12611041@campus.edu',
        phone: '9876543210'
      },
      simulatedNow: null,
      viewPrefs: {
        filters: {
          date: Utils.getLocalDateString(Utils.getNow()),
          buildingId: '',
          type: '',
          minCapacity: '',
          facilities: [],
          onlyFree: false,
          searchQuery: ''
        },
        viewMode: 'grid'
      }
    };
  }
};
