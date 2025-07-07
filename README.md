# FlowCal

A modern, collaborative calendar and scheduling web app built with React, Firebase, and Tailwind CSS. FlowCal enables users to create, manage, and share events with real-time updates, reminders, and timezone support.

## Features

- **User Authentication**: Sign up, log in, and log out with email/password or Google.
- **Event Scheduling**: Create, edit, and delete events with support for types, durations, locations, and attachments.
- **Collaboration**: Invite attendees by email and view events you're invited to.
- **Conflict Detection**: Automatic detection of scheduling conflicts.
- **Reminders**: Set customizable reminders for events.
- **Timezone Support**: Schedule and view events in any timezone.
- **Multiple Views**: Switch between list, month, week, and day calendar views.
- **Dark Mode**: Toggle between light and dark themes.
- **Responsive UI**: Built with Tailwind CSS for a seamless experience on all devices.
- **PWA Ready**: Installable as a Progressive Web App.

## Tech Stack

- **Frontend**: React, Tailwind CSS, Day.js, Lucide React Icons
- **Backend/Cloud**: Firebase (Authentication, Firestore, Storage, Analytics)
- **Testing**: Jest, React Testing Library

## Getting Started

### Prerequisites

- Node.js (v16+ recommended)
- npm

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/flowcal.git
   cd flowcal
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Firebase:**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/).
   - Enable Authentication (Email/Password and Google), Firestore, and Storage.
   - Copy your Firebase config to a `.env` file in the project root:
     ```
     REACT_APP_FIREBASE_API_KEY=your_api_key
     REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
     REACT_APP_FIREBASE_PROJECT_ID=your_project_id
     REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
     REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
     REACT_APP_FIREBASE_APP_ID=your_app_id
     REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
     ```

4. **Start the development server:**
   ```bash
   npm start
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests

```bash
npm test
```

## Project Structure

```
src/
  components/
    VibeCalendarScheduler.jsx   # Main calendar and scheduling component
  firebase.js                  # Firebase configuration and exports
  App.js                       # App entry, renders the scheduler
  index.js                     # React root
  index.css, App.css           # Styles (Tailwind + custom)
public/
  index.html, manifest.json, icons  # PWA and static assets
firestore.rules                # Firestore security rules
tailwind.config.js             # Tailwind CSS configuration
```

## Usage

- **Authentication**: Log in or sign up to start scheduling.
- **Add Events**: Click the "+" button, fill in event details, and invite attendees.
- **View Modes**: Switch between list, month, week, or day views.
- **Dark Mode**: Toggle the theme using the UI switch.
- **Reminders**: Set reminders for upcoming events.
- **Attachments**: Upload files to events (stored in Firebase Storage).

## Deployment

To build for production:
```bash
npm run build
```
Deploy the `build/` folder to your preferred hosting. For Firebase Hosting:
```bash
npm install -g firebase-tools
firebase login
firebase init
firebase deploy
```


## Acknowledgements

- [Create React App](https://create-react-app.dev/)
- [Firebase](https://firebase.google.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Day.js](https://day.js.org/)
- [Lucide Icons](https://lucide.dev/)
