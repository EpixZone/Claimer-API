// utils/balanceUtils.js

const verifyBalances = (originalBalance, finalBalance, targetBalance) => {
    console.log('Total original balance:', originalBalance.toFixed(8));
    console.log('Total final balance:', finalBalance.toFixed(8));
    console.log('Target balance:', targetBalance.toFixed(8));
    console.log('Difference from target:', (finalBalance - targetBalance).toFixed(8));
};

module.exports = {
    verifyBalances
};