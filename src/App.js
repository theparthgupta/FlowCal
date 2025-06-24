// src/App.js

import React from 'react';
import VibeCalendarScheduler from './components/VibeCalendarScheduler';

function App() {
  return (
    <div className="App">
      <VibeCalendarScheduler
        onEventAdd={(evt) => console.log('New event added:', evt)}
      />
    </div>
  );
}

export default App;
