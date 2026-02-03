# Nephilims
Project Name: Learning Roadmap & Resource Organizer
Group Name: Nephilims

Students Name:

Karthikeya Reddy Maddikuntla

Sai Hari Chandra Prasad Cherukumalla

1. Website Conceptualization
The Learning Roadmap & Resource Organizer is a web application that helps self‑taught learners and students turn messy resources (links, videos, PDFs, notes) into structured learning roadmaps they can actually complete. Instead of scattered bookmarks and random playlists, users build clear paths for goals like “Full‑Stack Web Development,” “Data Structures,” or “Machine Learning,” and track their progress step by step.

Mission Statement
Our mission is to help learners plan, organize, and complete long‑term learning goals by transforming unstructured online resources into clear, trackable learning roadmaps.

The site focuses on three core ideas:

Define a roadmap with modules and tasks for any learning goal.

Attach and organize resources (articles, videos, courses, GitHub repos).

Track progress visually with completion percentages, streaks, and summaries.

2. Target Users
2.1 Self‑Taught Developers and Tech Learners
Demographics and interests

Age 18–35, learning programming, web development, or data science on their own while in college or working.

Use online courses, YouTube, blogs, GitHub, and learning roadmaps.

What they need from the site

A clear path to follow (e.g., “Frontend Roadmap”) instead of jumping between random resources.

A way to store all course links, videos, and articles in one place.

Visual progress tracking to stay motivated over weeks or months.

How the site supports them

Lets them create or clone roadmaps with modules like “HTML & CSS,” “JavaScript Basics,” “React,” “Node & Databases.”

Offers tasks with attached links and notes so all resources live in a single organized structure.

Shows completion percentages and streaks so users can quickly see “how far am I?” and “what’s next?”.

2.2 University and Grad Students
Demographics and interests

College and graduate students balancing courses, self‑study, and projects.

Interested in organizing course topics, revision plans, and external learning (e.g., LeetCode, research skills).

What they need from the site

A way to break down big goals (e.g., “Finish algorithms syllabus,” “Learn Django”) into manageable weekly tasks.

A central system to collect lecture notes, reference links, and practice problems.

Tools to plan across a semester, not just daily to‑do lists.

How the site supports them

Roadmaps structured by weeks or topics that match their courses or exam syllabi.

Attachments and links to PDFs, lecture slides, or online references in each task.

Overviews that show progress per course/roadmap and help them decide where to focus next.

2.3 Bootcamp Participants and Online Course Learners
Demographics and interests

Learners enrolled in coding bootcamps or long online programs who must keep track of many modules and projects.

Interested in staying on schedule and not falling behind.

What they need from the site

A way to mirror or customize the bootcamp’s curriculum as a roadmap.

Progress tracking beyond the platform’s own dashboard, especially when combining multiple courses.

Reminders and a personal view of “what to do today/this week.”

How the site supports them

Custom roadmaps that reflect structured curricula (e.g., “Module 1 – HTML/CSS,” “Module 2 – JS,” etc.).

Daily/weekly views showing upcoming tasks and incomplete modules.

Simple reminders so they remember to study even when busy.

2.4 Educators, Mentors, and Study Group Leaders (Secondary Audience)
Demographics and interests

Instructors, mentors, or senior students who guide others through a curriculum or study plan.

Interested in sharing curated resource lists and tracking how far their mentees have progressed.

What they need from the site

A way to publish template roadmaps for a specific topic or course.

Basic aggregated progress insights for a group.

How the site supports them

“Template roadmaps” that others can clone and adapt to their own pace.

Optional group view where they can see high‑level completion stats (e.g., “70% of group finished Module 1”).

3. Main Functionalities
Below are eight EPIC‑level features that can later be broken down into smaller user stories and tasks.

3.1 Roadmap Creation and Templates (EPIC)
Users can create new learning roadmaps from scratch or from templates (e.g., “Frontend Developer Roadmap,” “Python Basics”). A roadmap is made of modules and tasks, each with titles, descriptions, and estimated effort. This supports the mission by turning vague goals into clear structures that can be followed step by step.

3.2 Module and Task Management (EPIC)
Within each roadmap, users can add, edit, reorder, and delete modules and tasks. Each task can be marked as “Not Started,” “In Progress,” or “Completed,” and can have due dates or target weeks. This feature gives learners fine‑grained control over how they break down their learning objectives.

3.3 Resource Organizer and Attachments (EPIC)
Users can attach multiple resources to each task: URLs (articles, videos, courses), file links, or notes. Resources are tagged by type (video, article, course, documentation) so learners can quickly see the format. This addresses the problem of scattered bookmarks by centralizing everything in context with the tasks they belong to.

3.4 Progress Tracking Dashboard (EPIC)
A personal dashboard shows overall progress across roadmaps (for example, “Full‑Stack Web Dev – 45% complete”), recent activity, and simple statistics. Visual indicators such as progress bars, completion percentages, and streak counts help users answer “how far am I?” at a glance. This supports motivation and long‑term consistency.

3.5 Daily and Weekly Study View (EPIC)
The site provides focused daily and weekly views that list tasks due today or this week, across all roadmaps. Users can filter by roadmap or priority and quickly decide what to work on now. This bridges the gap between long‑term plans and short‑term action.

3.6 Reminders and Notifications (EPIC)
Users can opt in to reminders for specific tasks or modules (for example, “Remind me on Monday at 7 pm”). Notifications may appear in‑app or via email, depending on the implementation. This helps prevent learners from forgetting their plans when life gets busy.

3.7 Sharing and Template Publishing (EPIC)
Users can share a roadmap link as read‑only or publish it as a template that others can clone. Mentors or educators can design structured paths and distribute them to their mentees or students. This increases the usefulness of the platform beyond individual learners and encourages community sharing of high‑quality paths.

3.8 Analytics & Insights (EPIC)
The system can provide simple analytics such as average completion per roadmap, time since last activity, and which modules are most often left incomplete. Over time, this feature can highlight bottlenecks and suggest where learners may need to review or simplify tasks. These insights align with the mission by helping users and mentors continuously improve their learning plans.

3.9 Unique Selling Points (USPs)
Focused specifically on learning roadmaps, not generic to‑do lists.

Combines resource organization with progress tracking and visual dashboards.

Supports both individual learners and mentors via templates and shared roadmaps.

4. Preliminary Development Plan
The development will follow five phases: Research & Analysis, Design, Development, Testing, and Launch & Maintenance.

4.1 Phase 1 – Research & Analysis
Interview or survey self‑taught learners, students, and mentors about how they currently track learning (spreadsheets, notebooks, apps).

Review existing tools like developer roadmaps, study planners, and progress trackers to identify gaps and best practices.

Define 3–4 user personas (self‑taught dev, college student, bootcamp learner, mentor) with clear goals and pain points.

Prioritize features for a minimum viable product (MVP): roadmap creation, tasks, resources, basic progress tracking.

4.2 Phase 2 – Design (UI/UX)
Sketch low‑fidelity wireframes for core screens: Dashboard, Roadmap view, Module/Task editor, Daily/Weekly view, and Resource attachments.

Design navigation so users can quickly switch between “My Roadmaps,” “Today,” and “Dashboard.”

Apply responsive design to make the app usable on laptop and mobile.

Follow accessibility guidelines (semantic HTML, keyboard navigation, sufficient contrast) to support different learners.

4.3 Phase 3 – Development
Front‑end

Use HTML5, CSS3 (or a framework like Tailwind CSS/Bootstrap), and JavaScript.

Implement a modern front‑end framework such as React or Vue to build reusable components for roadmaps, modules, and progress bars.

Back‑end

Use Node.js with Express or a Python framework like Django/Flask for the API.

Design RESTful endpoints for users, roadmaps, modules, tasks, and resources.

Store data in a relational database (PostgreSQL/MySQL) or a document database like MongoDB.

Other considerations

Implement authentication (email/password or external provider) so each user has a private workspace.

Set up Git/GitHub for version control and use branches and Pull Requests for collaboration.

4.4 Phase 4 – Testing
Usability testing

Ask a few learners to use the MVP to set up one roadmap and complete a few tasks.

Collect feedback on clarity of UI, ease of adding resources, and usefulness of the dashboard.

Functional and integration testing

Write unit tests for core logic (task status updates, progress calculation, access control).

Test main flows: create roadmap → add modules → add tasks/resources → mark complete → see dashboard update.

Performance and security testing

Check that dashboards and roadmaps load efficiently even when they have many tasks and resources.

Validate inputs, sanitize user content, and secure authentication to protect user data.

4.5 Phase 5 – Launch & Maintenance
Launch

Deploy an initial version (for example, to a cloud platform) for a small group of test users (friends, classmates, study group).

Monitor usage and gather initial feedback on missing features or confusing UI elements.

Maintenance and iteration

Fix bugs and refine UX based on feedback, especially around roadmap editing and progress tracking.

Add enhancements such as advanced analytics, more notification options, and public template libraries.

Keep dependencies updated and apply regular security patches.

5. Collaboration and Git Workflow Notes
Each team member in Nephilims will:

Create or use a personal feature branch (for example, feature/mission, feature/users, feature/functions, feature/dev-plan).

Edit the README.md to contribute content, formatting, or references.

Use clear commit messages such as Added target users section or Refined EPIC features.