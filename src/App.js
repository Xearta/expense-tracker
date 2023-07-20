import React from "react";
import BillTracker from "./BillTracker";
import PaydayTracker from "./PaydayTracker";

const App = () => {
  return (
    <div>
      <h1>My Bill Tracking App</h1>
      <BillTracker />
      <PaydayTracker />
    </div>
  );
};

export default App;
