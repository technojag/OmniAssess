# Decisions Log

- Stack: React + Vite + TypeScript + Tailwind (web); Node + Express + TypeScript (api); PostgreSQL + Prisma.
- Database: Neon (cloud PostgreSQL), no local Docker for now.
- Exam timing, section locking, scoring and answer keys are enforced on the SERVER only.
- Exam rules live in configuration (exam templates), never hard-coded per exam.
- Redis, Socket.IO and queues are postponed until there is a measured need.