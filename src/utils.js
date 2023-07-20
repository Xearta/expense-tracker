// Utility function to calculate the total amount of bills
export const calculateTotalAmount = (bills) => {
  return bills.reduce((total, bill) => total + bill.amount, 0);
};
