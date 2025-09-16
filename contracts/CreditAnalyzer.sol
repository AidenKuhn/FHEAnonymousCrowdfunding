// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, euint8, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title CreditAnalyzer
 * @dev A confidential credit evaluation system using Fully Homomorphic Encryption
 * @notice This contract allows users to submit encrypted financial data for credit scoring
 *         while keeping all sensitive information private on-chain
 */
contract CreditAnalyzer is SepoliaConfig {
    
    address public owner;
    uint256 public totalEvaluations;
    
    // Credit score ranges
    uint8 constant EXCELLENT_SCORE = 5;  // 750+
    uint8 constant GOOD_SCORE = 4;       // 650-749
    uint8 constant FAIR_SCORE = 3;       // 550-649
    uint8 constant POOR_SCORE = 2;       // 450-549
    uint8 constant BAD_SCORE = 1;        // <450
    
    struct CreditData {
        euint32 encryptedIncome;        // Monthly income (encrypted)
        euint32 encryptedDebt;          // Total debt (encrypted)
        euint8 encryptedAge;            // Age (encrypted)
        euint8 encryptedCreditHistory;  // Credit history length in years (encrypted)
        euint8 encryptedPaymentHistory; // Payment history score 1-10 (encrypted)
        bool hasSubmitted;
        uint256 submissionTime;
    }
    
    struct CreditEvaluation {
        euint8 encryptedScore;          // Final credit score (encrypted)
        bool isEvaluated;
        uint256 evaluationTime;
        ebool isApproved;               // Loan approval status (encrypted)
    }
    
    mapping(address => CreditData) public creditSubmissions;
    mapping(address => CreditEvaluation) public creditEvaluations;
    
    event CreditDataSubmitted(address indexed user, uint256 timestamp);
    event CreditEvaluated(address indexed user, uint256 timestamp);
    event LoanApprovalRequested(address indexed user, uint256 timestamp);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    modifier hasSubmittedData() {
        require(creditSubmissions[msg.sender].hasSubmitted, "No credit data submitted");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        totalEvaluations = 0;
    }
    
    /**
     * @dev Submit encrypted credit data for evaluation
     */
    function submitCreditData(
        euint32 _encryptedIncome,
        euint32 _encryptedDebt,
        euint8 _encryptedAge,
        euint8 _encryptedCreditHistory,
        euint8 _encryptedPaymentHistory
    ) external {
        require(!creditSubmissions[msg.sender].hasSubmitted, "Data already submitted");
        
        creditSubmissions[msg.sender] = CreditData({
            encryptedIncome: _encryptedIncome,
            encryptedDebt: _encryptedDebt,
            encryptedAge: _encryptedAge,
            encryptedCreditHistory: _encryptedCreditHistory,
            encryptedPaymentHistory: _encryptedPaymentHistory,
            hasSubmitted: true,
            submissionTime: block.timestamp
        });
        
        // Grant access permissions
        _grantDataAccessPermissions(_encryptedIncome, _encryptedDebt, _encryptedAge, _encryptedCreditHistory, _encryptedPaymentHistory);
        
        emit CreditDataSubmitted(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Evaluate credit score using encrypted computation
     */
    function evaluateCreditScore(address user) external hasSubmittedData {
        require(msg.sender == user || msg.sender == owner, "Not authorized to evaluate");
        require(!creditEvaluations[user].isEvaluated, "Already evaluated");
        
        CreditData storage data = creditSubmissions[user];
        
        // Calculate credit score through modular approach
        euint8 score = _calculateBaseScore(data);
        score = _applyAgeBonus(score, data.encryptedAge);
        score = _applyCreditHistoryBonus(score, data.encryptedCreditHistory);
        score = _applyPaymentHistoryBonus(score, data.encryptedPaymentHistory);
        score = _applyDebtPenalty(score, data.encryptedDebt, data.encryptedIncome);
        score = _applyIncomeBonus(score, data.encryptedIncome);
        score = _enforceScoreLimits(score);
        
        // Calculate loan approval
        ebool approved = FHE.ge(score, FHE.asEuint8(FAIR_SCORE));
        
        creditEvaluations[user] = CreditEvaluation({
            encryptedScore: score,
            isEvaluated: true,
            evaluationTime: block.timestamp,
            isApproved: approved
        });
        
        // Grant access permissions for results
        FHE.allowThis(score);
        FHE.allowThis(approved);
        FHE.allow(score, user);
        FHE.allow(approved, user);
        
        totalEvaluations++;
        emit CreditEvaluated(user, block.timestamp);
    }
    
    /**
     * @dev Internal function to grant data access permissions
     */
    function _grantDataAccessPermissions(
        euint32 income,
        euint32 debt,
        euint8 age,
        euint8 creditHistory,
        euint8 paymentHistory
    ) internal {
        FHE.allowThis(income);
        FHE.allowThis(debt);
        FHE.allowThis(age);
        FHE.allowThis(creditHistory);
        FHE.allowThis(paymentHistory);
        
        FHE.allow(income, msg.sender);
        FHE.allow(debt, msg.sender);
        FHE.allow(age, msg.sender);
        FHE.allow(creditHistory, msg.sender);
        FHE.allow(paymentHistory, msg.sender);
    }
    
    /**
     * @dev Calculate base credit score
     */
    function _calculateBaseScore(CreditData storage) internal returns (euint8) {
        return FHE.asEuint8(FAIR_SCORE);
    }
    
    /**
     * @dev Apply age bonus to credit score
     */
    function _applyAgeBonus(euint8 score, euint8 age) internal returns (euint8) {
        ebool ageBonus = FHE.gt(age, FHE.asEuint8(25));
        score = FHE.select(ageBonus, FHE.add(score, FHE.asEuint8(1)), score);
        
        ebool matureAgeBonus = FHE.gt(age, FHE.asEuint8(40));
        return FHE.select(matureAgeBonus, FHE.add(score, FHE.asEuint8(1)), score);
    }
    
    /**
     * @dev Apply credit history bonus to score
     */
    function _applyCreditHistoryBonus(euint8 score, euint8 creditHistory) internal returns (euint8) {
        ebool historyBonus = FHE.gt(creditHistory, FHE.asEuint8(5));
        score = FHE.select(historyBonus, FHE.add(score, FHE.asEuint8(1)), score);
        
        ebool longHistoryBonus = FHE.gt(creditHistory, FHE.asEuint8(10));
        return FHE.select(longHistoryBonus, FHE.add(score, FHE.asEuint8(1)), score);
    }
    
    /**
     * @dev Apply payment history bonus to score
     */
    function _applyPaymentHistoryBonus(euint8 score, euint8 paymentHistory) internal returns (euint8) {
        ebool paymentBonus = FHE.gt(paymentHistory, FHE.asEuint8(7));
        score = FHE.select(paymentBonus, FHE.add(score, FHE.asEuint8(1)), score);
        
        ebool perfectPayment = FHE.eq(paymentHistory, FHE.asEuint8(10));
        return FHE.select(perfectPayment, FHE.add(score, FHE.asEuint8(1)), score);
    }
    
    /**
     * @dev Apply debt penalty to score
     */
    function _applyDebtPenalty(euint8 score, euint32 debt, euint32 income) internal returns (euint8) {
        // High debt penalty
        ebool highDebt = FHE.gt(debt, FHE.asEuint32(20000));
        score = FHE.select(highDebt, FHE.sub(score, FHE.asEuint8(1)), score);
        
        ebool veryHighDebt = FHE.gt(debt, FHE.asEuint32(50000));
        score = FHE.select(veryHighDebt, FHE.sub(score, FHE.asEuint8(1)), score);
        
        // Debt-to-income comparison
        ebool debtExceedsIncome = FHE.gt(debt, income);
        score = FHE.select(debtExceedsIncome, FHE.sub(score, FHE.asEuint8(2)), score);
        
        euint32 doubleIncome = FHE.mul(income, FHE.asEuint32(2));
        ebool debtExceedsDoubleIncome = FHE.gt(debt, doubleIncome);
        return FHE.select(debtExceedsDoubleIncome, FHE.sub(score, FHE.asEuint8(1)), score);
    }
    
    /**
     * @dev Apply income bonus to score
     */
    function _applyIncomeBonus(euint8 score, euint32 income) internal returns (euint8) {
        ebool incomeBonus = FHE.gt(income, FHE.asEuint32(5000));
        score = FHE.select(incomeBonus, FHE.add(score, FHE.asEuint8(1)), score);
        
        ebool highIncomeBonus = FHE.gt(income, FHE.asEuint32(10000));
        return FHE.select(highIncomeBonus, FHE.add(score, FHE.asEuint8(1)), score);
    }
    
    /**
     * @dev Enforce score limits (1-5 range)
     */
    function _enforceScoreLimits(euint8 score) internal returns (euint8) {
        ebool scoreTooLow = FHE.lt(score, FHE.asEuint8(1));
        score = FHE.select(scoreTooLow, FHE.asEuint8(1), score);
        
        ebool scoreTooHigh = FHE.gt(score, FHE.asEuint8(5));
        return FHE.select(scoreTooHigh, FHE.asEuint8(5), score);
    }
    
    /**
     * @dev Request loan approval based on credit evaluation
     */
    function requestLoanApproval() external hasSubmittedData {
        require(creditEvaluations[msg.sender].isEvaluated, "Credit not evaluated yet");
        emit LoanApprovalRequested(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Check if user has submitted credit data
     */
    function hasSubmittedCreditData(address user) external view returns (bool) {
        return creditSubmissions[user].hasSubmitted;
    }
    
    /**
     * @dev Check if user's credit has been evaluated
     */
    function isCreditEvaluated(address user) external view returns (bool) {
        return creditEvaluations[user].isEvaluated;
    }
    
    /**
     * @dev Get evaluation statistics
     */
    function getEvaluationStats() external view returns (uint256) {
        return totalEvaluations;
    }
    
    /**
     * @dev Get user's encrypted credit score (only accessible by user or owner)
     */
    function getEncryptedCreditScore(address user) external view returns (euint8) {
        require(msg.sender == user || msg.sender == owner, "Not authorized");
        require(creditEvaluations[user].isEvaluated, "Not evaluated");
        return creditEvaluations[user].encryptedScore;
    }
    
    /**
     * @dev Get user's encrypted loan approval status
     */
    function getEncryptedLoanApproval(address user) external view returns (ebool) {
        require(msg.sender == user || msg.sender == owner, "Not authorized");
        require(creditEvaluations[user].isEvaluated, "Not evaluated");
        return creditEvaluations[user].isApproved;
    }
}
