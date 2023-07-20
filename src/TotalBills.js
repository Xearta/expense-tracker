import React from "react";

import { calculateTotalAmount } from "./utils";

const TotalBills = ({ filteredBills }) => {
  return (
    <div className="card p-3">
      <h3>Total Bills:</h3>
      <p className="h4">${calculateTotalAmount(filteredBills).toFixed(2)}</p>
    </div>
  );
};

export default TotalBills;
