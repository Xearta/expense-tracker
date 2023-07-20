import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { ref, update, onValue, set } from "firebase/database"; // Import the database functions you need
import database from "./firebase"; // Import the database instance
import moment from "moment";

const PaydayTracker = (props) => {
  const [paydays, setPaydays] = useState([]);
  const [nextPayday, setNextPayday] = useState("");
  const [paydayAmount, setPaydayAmount] = useState("");
  const [paydayFrequency, setPaydayFrequency] = useState("weekly");

  // State variable to track if data has been loaded from Firebase
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load data from Firebase on component mount
  useEffect(() => {
    loadDataFromFirebase("paydays", setPaydays);
  }, []);

  // Save data to Firebase whenever paydays change
  useEffect(() => {
    if (dataLoaded) {
      checkAndGeneratePaydays();
      saveDataToFirebase("paydays", paydays);
      // ... Other actions you want to perform when paydays change
    }
  }, [paydays]);

  const loadDataFromFirebase = (node, setState) => {
    const dataRef = ref(database, node);
    onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert data object to an array using Object.values()
        const paydaysArray = Object.values(data || {});
        setState(paydaysArray);
      }

      setDataLoaded(true);
    });
  };

  const saveDataToFirebase = (node, data) => {
    const dataRef = ref(database, node);
    set(dataRef, data);
  };

  const addPayday = () => {
    if (nextPayday && paydayAmount) {
      const payday = {
        date: nextPayday,
        amount: parseFloat(paydayAmount),
      };

      setPaydays((prevPaydays) => [...prevPaydays, payday]);
      setNextPayday("");
      setPaydayAmount("");
    }
  };

  const generatePaydays = () => {
    if (nextPayday && paydayFrequency && paydayAmount) {
      const frequencyInDays = {
        weekly: 7,
        biweekly: 14,
        monthly: 30,
      };

      const paydaysList = [];
      const currentDate = moment(nextPayday); // Use moment to parse the selected date
      const amount = parseFloat(paydayAmount);

      for (let i = 0; i < 5; i++) {
        const paydayDate = moment(currentDate); // Use moment to create the new date
        paydayDate.add(i * frequencyInDays[paydayFrequency], "days"); // Add the frequency in days

        // Ensure the time is set to 12:00 AM local time on the specified date
        paydayDate.set({ hour: 0, minute: 0, second: 0, millisecond: 0 });

        paydaysList.push({
          date: paydayDate.format("YYYY-MM-DD"), // Format the date as a string
          amount: amount,
        });
      }

      setPaydays(paydaysList);
    }
  };

  const getNextPayday = () => {
    const currentDate = moment().format("YYYY-MM-DD");
    const sortedPaydays = [...paydays].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    const nextPayday = sortedPaydays.find(
      (payday) => payday.date >= currentDate
    );
    return nextPayday ? nextPayday.date : "N/A";
  };

  const checkAndGeneratePaydays = () => {
    console.log("checking paydays");

    // Check if there are at least 10 paydays after today's date
    const currentDate = moment().startOf("day");
    const sortedPaydays = [...paydays].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    const next10Paydays = sortedPaydays.filter((payday) =>
      moment(payday.date).isAfter(currentDate)
    );

    if (next10Paydays.length < 10) {
      // Generate additional paydays until there are 10
      const lastPaydayDate = sortedPaydays[sortedPaydays.length - 1]?.date;
      const lastPaydayAmount = sortedPaydays[sortedPaydays.length - 1]?.amount;
      const nextPaydayDate = lastPaydayDate
        ? moment(lastPaydayDate).add(14, "day")
        : moment().startOf("day"); // If there are no paydays yet, start from today

      generatePayday(nextPaydayDate, lastPaydayAmount);

      console.log("less than 10 paydays");
    }

    console.log(next10Paydays, paydays);
  };

  const generatePayday = (date, amount) => {
    const newPayday = {
      date: date.format("YYYY-MM-DD"), // Format the date as a string
      amount: amount,
    };

    setPaydays((prevPaydays) => [...prevPaydays, newPayday]);
  };

  return (
    <div>
      <h2>Payday Tracker</h2>
      <div className="container mt-4">
        <div className="row justify-content-center">
          {" "}
          {/* Center the row */}
          <div className="col-md-3">
            <div className="card p-3 align-items-center d-flex justify-content-center">
              <p className="h4">
                Next Payday: {moment(getNextPayday()).format("MM/DD/YYYY")}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div>
        <label htmlFor="nextPayday">Next Payday:</label>
        <input
          type="date"
          id="nextPayday"
          value={nextPayday}
          onChange={(e) => setNextPayday(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="paydayAmount">Payday Amount:</label>
        <input
          type="number"
          id="paydayAmount"
          value={paydayAmount}
          onChange={(e) => setPaydayAmount(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="paydayFrequency">Payday Frequency:</label>
        <select
          id="paydayFrequency"
          value={paydayFrequency}
          onChange={(e) => setPaydayFrequency(e.target.value)}
        >
          <option value="weekly">Weekly</option>
          <option value="biweekly">Biweekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <button onClick={addPayday}>Add Payday</button>
      <button onClick={generatePaydays}>Generate Paydays</button>
      <div>
        <h3>Upcoming Paydays:</h3>
        <ul>
          {paydays.map((payday, index) => (
            <li key={index}>
              {moment(payday.date).format("MM/DD/YYYY")} - Amount: $
              {payday.amount.toFixed(2)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PaydayTracker;
