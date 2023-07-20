import React, { useState, useEffect, useRef } from "react";

import TotalBills from "./TotalBills";
import TotalOutstandingBalance from "./TotalOustandingBalance";
import { calculateTotalAmount } from "./utils";

import { format } from "date-fns";
import DatePicker from "react-datepicker";
import { ref, onValue, update, set } from "firebase/database"; // Import the database functions you need
import database from "./firebase"; // Import the database instance
import "react-datepicker/dist/react-datepicker.css";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";

// Import Bootstrap styles
import "bootstrap/dist/css/bootstrap.min.css";

const BillTracker = () => {
  const [balance, setBalance] = useState(1000);
  const [editedBalance, setEditedBalance] = useState(balance);

  const [bills, setBills] = useState([]);
  const [newBill, setNewBill] = useState("");
  const [newBillAmount, setNewBillAmount] = useState("");
  const [newBillDueDate, setNewBillDueDate] = useState(new Date());
  const [editingIndex, setEditingIndex] = useState(null);
  const [frequency, setFrequency] = useState("onetime");
  const [spendableAmount, setSpendableAmount] = useState(0);
  const [filteredBills, setFilteredBills] = useState([]);

  const [paydays, setPaydays] = useState([]);

  // State variable to track if data has been loaded from Firebase
  const [dataLoaded, setDataLoaded] = useState(false);

  const isFirstLoad = useRef(true);

  useEffect(() => {
    const loadData = async () => {
      // Fetch data from Firebase for bills and paydays concurrently
      const [billsData, paydaysData] = await Promise.all([
        loadDataFromFirebase("bills"),
        loadDataFromFirebase("paydays"),
      ]);

      // Set the fetched data to the corresponding state variables
      setBills(billsData);
      setPaydays(paydaysData);

      // Mark data as loaded
      setDataLoaded(true);
    };

    // Call the loadData function
    loadData();
  }, []);

  useEffect(() => {
    // Listen for changes to the paydays data in Firebase and update the state
    const paydaysRef = ref(database, "paydays");
    onValue(paydaysRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert data object to an array using Object.values()
        const paydaysArray = Object.values(data || {});
        setPaydays(paydaysArray);
      }
    });
  }, []);

  // Listen for changes to the bills data in Firebase and update the state
  useEffect(() => {
    const billsRef = ref(database, "bills");
    onValue(billsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert data object to an array using Object.values()
        const billsArray = Object.values(data || {});
        setBills(billsArray);
      }
    });
  }, []);

  // Run filterDueBills automatically after both paydays and bills data is loaded
  useEffect(() => {
    if (paydays.length > 0 && bills.length > 0) {
      filterDueBills();
    }
  }, [paydays, bills]);

  useEffect(() => {
    if (dataLoaded) {
      // Data is loaded from Firebase, so now we can run checkDueDates once
      checkDueDates();
      filterDueBills();
    }
  }, [dataLoaded]);

  useEffect(() => {
    // Only execute this useEffect when data is loaded from Firebase
    if (dataLoaded & !isFirstLoad.current) {
      // Save data to Firebase whenever bills change
      saveDataToFirebase("bills", bills);
      filterDueBills();
      const spendableAmount = calculateSpendableAmount();
      setSpendableAmount(spendableAmount);
    }

    isFirstLoad.current = false;
  }, [bills, dataLoaded]);

  const loadDataFromFirebase = (node) => {
    console.log(`LOADING ${node} FROM FIREBASE`);

    const dataRef = ref(database, node);
    return new Promise((resolve, reject) => {
      onValue(
        dataRef,
        (snapshot) => {
          const data = snapshot.val();
          if (data) {
            // Convert data object to an array using Object.values()
            const dataArray = Object.values(data || {});
            resolve(dataArray);
          } else {
            // If there is no data, resolve with an empty array
            resolve([]);
          }
        },
        (error) => {
          // In case of an error, reject the promise with the error
          reject(error);
        }
      );
    });
  };

  const saveDataToFirebase = (node, data) => {
    const dataRef = ref(database, node);
    set(dataRef, data);
  };

  const checkDueDates = () => {
    const currentDate = moment().startOf("day");
    const midnightToday = moment().startOf("day");

    const updatedBills = bills.map((bill) => {
      if (moment(bill.dueDate) < midnightToday) {
        // Due date has passed, update the due date based on the frequency
        if (bill.frequency === "weekly") {
          bill.dueDate = getNextWeekDate(bill.dueDate);
        } else if (bill.frequency === "monthly") {
          bill.dueDate = getNextMonthDate(bill.dueDate);
        } else if (bill.frequency === "yearly") {
          bill.dueDate = getNextYearDate(bill.dueDate);
        }
      }

      return bill;
    });

    setBills(updatedBills);
  };

  const getNextWeekDate = (currentDate) => {
    return moment(currentDate).add(1, "week").format("YYYY-MM-DD");
  };

  const getNextMonthDate = (currentDate) => {
    return moment(currentDate).add(1, "month").format("YYYY-MM-DD");
  };

  const getNextYearDate = (currentDate) => {
    return moment(currentDate).add(1, "year").format("YYYY-MM-DD");
  };

  const addBill = () => {
    if (newBill && newBillAmount) {
      const currentDueDate = moment(newBillDueDate); // Convert to moment object

      if (editingIndex !== null) {
        // If editingIndex is not null, it means we are updating an existing bill
        const updatedBills = [...bills];
        updatedBills[editingIndex] = {
          ...updatedBills[editingIndex],
          name: newBill,
          amount: parseFloat(newBillAmount),
          dueDate: currentDueDate.format("YYYY-MM-DD"), // Format as "YYYY-MM-DD" for Firebase
          frequency: frequency || "One-Time",
        };
        setBills(updatedBills);
      } else {
        // If editingIndex is null, it means we are adding a new bill
        const bill = {
          id: uuidv4(),
          name: newBill,
          amount: parseFloat(newBillAmount),
          dueDate: currentDueDate.format("YYYY-MM-DD"),
          frequency: frequency || "One-Time",
          paid: false,
        };

        setFilteredBills([...filteredBills, bill]);
        setBills((prevBills) => [...prevBills, bill]);
      }

      // Reset the form and editing index after adding/updating a bill
      setNewBill("");
      setNewBillAmount("");
      setNewBillDueDate(new Date());
      setFrequency("onetime");
      setEditingIndex(null);
    }
  };

  const calculateSpendableAmount = () => {
    const currentDate = moment().startOf("day");

    // Find the next upcoming payday
    const nextPayday = paydays.find((payday) =>
      moment(payday.date).isSameOrAfter(currentDate)
    );

    if (!nextPayday) {
      console.log("ERROR: NO payday");
      return editedBalance;
    }

    const billsDueUntilNextPayday = bills.filter(
      (bill) =>
        moment(bill.dueDate).isSameOrAfter(currentDate) &&
        moment(bill.dueDate).isSameOrBefore(nextPayday.date)
    );

    const totalBillsDue = billsDueUntilNextPayday.reduce((sum, bill) => {
      return sum + bill.amount;
    }, 0);

    return editedBalance - totalBillsDue;
  };

  // Function to calculate the number of days until the next payday
  const daysUntilNextPayday = () => {
    const currentDate = moment().startOf("day");
    const nextPayday = paydays.find((payday) =>
      moment(payday.date).isSameOrAfter(currentDate)
    );

    if (nextPayday) {
      const daysUntilPayday = moment(nextPayday.date).diff(currentDate, "days");

      if (daysUntilPayday === 0) {
        return "PAYDAY!";
      }

      return daysUntilPayday;
    }

    return "ERROR"; // If no upcoming payday found, return 0
  };

  const handlePaymentToggle = (index) => {
    const updatedBills = [...bills];
    updatedBills[index].paid = !updatedBills[index].paid;
    setBills(updatedBills);

    checkDueDates();
    sortBills();
  };

  const sortBills = () => {
    const sortedBills = [...bills].sort((a, b) => {
      // Sort by paid status first (paid bills go to the bottom)
      //   if (a.paid && !b.paid) {
      //     return 1;
      //   } else if (!a.paid && b.paid) {
      //     return -1;
      //   }

      // Sort by due date
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    setBills(sortedBills);
  };

  const getNextPayday = () => {
    // Find the next upcoming payday
    const currentDate = moment().startOf("day").format("YYYY-MM-DD");
    const nextPayday = paydays.find((payday) =>
      moment(payday.date).isSameOrAfter(currentDate)
    );

    // Find the payday after the next payday
    const nextPaydayIndex = paydays.findIndex(
      (payday) => payday.date === nextPayday?.date
    );
    const secondNextPayday = paydays[nextPaydayIndex + 1];

    return { nextPayday, secondNextPayday };
  };

  const getCurrentMonthRange = () => {
    const currentDate = moment();
    const startDate = currentDate.startOf("month").format("YYYY-MM-DD");
    const endDate = currentDate.endOf("month").format("YYYY-MM-DD");
    return { startDate, endDate };
  };

  const filterDueBills = () => {
    const currentDate = moment().startOf("day").format("YYYY-MM-DD");
    const nextPayday = paydays.find((payday) =>
      moment(payday.date).isSameOrAfter(currentDate)
    );

    const filtered = bills.filter(
      (bill) =>
        moment(bill.dueDate).isSameOrAfter(currentDate) &&
        moment(bill.dueDate).isSameOrBefore(nextPayday?.date)
    );
    setFilteredBills(filtered);
  };

  const filterBillsBetweenPaydays = (startDate, endDate) => {
    const filtered = bills.filter(
      (bill) =>
        moment(bill.dueDate).isSameOrAfter(startDate, "day") &&
        moment(bill.dueDate).isSameOrBefore(endDate, "day")
    );
    return filtered;
  };

  const filterBillsBetweenNextPaydays = () => {
    const { nextPayday, secondNextPayday } = getNextPayday();
    const filteredBills = filterBillsBetweenPaydays(
      nextPayday.date,
      secondNextPayday.date
    );
    setFilteredBills(filteredBills);
  };

  const filterBillsInCurrentMonth = () => {
    const { startDate, endDate } = getCurrentMonthRange();
    const filteredBills = bills.filter(
      (bill) =>
        moment(bill.dueDate).isSameOrAfter(startDate, "day") &&
        moment(bill.dueDate).isSameOrBefore(endDate, "day")
    );
    setFilteredBills(filteredBills);
  };

  const filterNextMonthsBills = () => {
    // Get the first day of the next month
    const firstDayOfNextMonth = moment().add(1, "month").startOf("month");

    // Get the last day of the next month
    const lastDayOfNextMonth = moment().add(1, "month").endOf("month");

    // Filter bills based on their due dates
    const filtered = bills.filter((bill) => {
      const dueDate = moment(bill.dueDate);
      return dueDate.isBetween(
        firstDayOfNextMonth,
        lastDayOfNextMonth,
        null,
        "[]"
      );
    });

    setFilteredBills(filtered);
  };

  const showAllBills = () => {
    setFilteredBills(bills);
  };

  const editBill = (index) => {
    // Set the editing index to the selected bill's index
    setEditingIndex(index);

    // Populate the bill information into the add bill form
    const billToEdit = filteredBills[index];
    setNewBill(billToEdit.name);
    setNewBillAmount(billToEdit.amount);
    setNewBillDueDate(moment(billToEdit.dueDate).toDate());
    setFrequency(billToEdit.frequency);
  };

  const deleteBill = (billId) => {
    // Filter out the bill to be deleted from the state
    const updatedBills = bills.filter((bill) => bill.id !== billId);
    setBills(updatedBills);

    // Delete the bill wfrom Firebase (assuming the Firebase key is 'id')
    const billRef = ref(database, `bills/${billId}`);
    set(billRef, null);
  };

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-md-4 col-12 mx-auto">
          <div className="card p-3 align-items-center text-center">
            <h3>Account Balance</h3>
            <div>
              <p className="h4">${editedBalance.toFixed(2)}</p>
              <input
                type="number"
                value={editedBalance}
                onChange={(e) => setEditedBalance(parseFloat(e.target.value))}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setBalance(editedBalance);
                  const updatedSpendableAmount = calculateSpendableAmount();
                  setSpendableAmount(updatedSpendableAmount);
                }}
              >
                Save
              </button>
            </div>
            <h3>Spendable Amount</h3>
            <p className="h4">${spendableAmount.toFixed(2)}</p>
            <p className="h4">
              Days Until Next Payday: {daysUntilNextPayday()}
            </p>
          </div>
          <div className="card p-3 mt-3">
            <div className="add-bill-form">
              <input
                type="text"
                placeholder="Enter bill name"
                value={newBill}
                onChange={(e) => setNewBill(e.target.value)}
              />
              <input
                type="number"
                placeholder="Enter bill amount"
                value={newBillAmount}
                onChange={(e) => setNewBillAmount(e.target.value)}
              />
              <DatePicker
                selected={newBillDueDate}
                onChange={(date) => setNewBillDueDate(date)}
                className="form-control"
              />
              <select
                id="billFrequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="form-control"
              >
                <option value="onetime">One Time</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <button className="btn btn-primary mt-2" onClick={addBill}>
                Add Bill
              </button>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="row mb-3">
            <div className="col-md-12">
              {/* Filter buttons */}
              <button
                className="btn btn-secondary mr-2"
                onClick={filterDueBills}
              >
                Due Bills
              </button>
              <button
                className="btn btn-secondary mr-2"
                onClick={filterBillsBetweenNextPaydays}
              >
                Next Paycheck Bills
              </button>
              <button
                className="btn btn-secondary mr-2"
                onClick={filterBillsInCurrentMonth}
              >
                {`${moment().format("MMMM")}`}
              </button>
              <button
                className="btn btn-secondary mr-2"
                onClick={filterNextMonthsBills}
              >
                {moment().add(1, "month").format("MMMM")}
              </button>
              <button className="btn btn-secondary" onClick={showAllBills}>
                Show All
              </button>
            </div>
          </div>
          <table className="table bill-table">
            <thead>
              <tr>
                <th>Bill Name</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Frequency</th>
                <th>Paid</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((bill, index) => (
                <tr key={index}>
                  <td>{bill.name}</td>
                  <td>${bill.amount.toFixed(2)}</td>
                  <td>{moment(bill.dueDate).format("MM/DD/YYYY")}</td>
                  <td>{bill.frequency}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={bill.paid}
                      onChange={() => handlePaymentToggle(index)}
                    />
                  </td>

                  <td>
                    <button
                      className="btn btn-sm btn-warning action-btn mr-2"
                      onClick={() => editBill(index)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger action-btn"
                      onClick={() => {
                        const confirmDelete = window.confirm(
                          "Are you sure you want to delete this bill?"
                        );
                        if (confirmDelete) {
                          deleteBill(bill.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="container mt-6">
            <div className="row mt-3 justify-content-center">
              <div className="col-md-4">
                <TotalBills filteredBills={filteredBills} />
              </div>
              <div className="col-md-8">
                <TotalOutstandingBalance filteredBills={filteredBills} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillTracker;
