import React from "react";

import { calculateTotalAmount } from "./utils";

const TotalOutstandingBalance = ({ filteredBills }) => {
  return (
    <div className="card p-3">
      <h3>Total Outstanding Balance:</h3>
      <p className="h4">
        $
        {calculateTotalAmount(
          filteredBills.filter((bill) => !bill.paid)
        ).toFixed(2)}
      </p>
    </div>
  );
};

export default TotalOutstandingBalance;
