// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract PrivacyCrowdfunding {
    struct Campaign {
        uint256 id;
        address creator;
        string title;
        string description;
        string category;
        uint256 goal;
        uint256 raised;
        uint256 deadline;
        bool isActive;
        bool goalReached;
        bool fundsWithdrawn;
    }

    struct Donation {
        uint256 campaignId;
        address donor;
        uint256 amount;
        uint256 timestamp;
        bool isAnonymous;
    }

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => Donation[]) public campaignDonations;
    mapping(address => uint256[]) public userCampaigns;
    mapping(address => uint256[]) public userDonations;
    
    uint256 public campaignCounter;
    uint256 public totalCampaigns;
    uint256 public totalDonations;
    uint256 public platformFee = 10; // 1% platform fee (reduced)

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        string title,
        uint256 goal,
        uint256 deadline
    );

    event DonationMade(
        uint256 indexed campaignId,
        address indexed donor,
        uint256 amount,
        bool isAnonymous
    );

    event FundsWithdrawn(
        uint256 indexed campaignId,
        address indexed creator,
        uint256 amount
    );

    event RefundIssued(
        uint256 indexed campaignId,
        address indexed donor,
        uint256 amount
    );

    modifier onlyCampaignCreator(uint256 _campaignId) {
        require(campaigns[_campaignId].creator == msg.sender, "Not campaign creator");
        _;
    }

    modifier campaignExists(uint256 _campaignId) {
        require(_campaignId < campaignCounter, "Campaign does not exist");
        _;
    }

    modifier campaignActive(uint256 _campaignId) {
        require(campaigns[_campaignId].isActive, "Campaign not active");
        require(block.timestamp < campaigns[_campaignId].deadline, "Campaign ended");
        _;
    }

    function createCampaign(
        string memory _title,
        string memory _description,
        string memory _category,
        uint256 _goal,
        uint256 _durationDays
    ) external returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(_goal > 0, "Goal must be greater than 0");
        require(_durationDays > 0 && _durationDays <= 365, "Invalid duration");

        uint256 campaignId = campaignCounter++;
        uint256 deadline = block.timestamp + (_durationDays * 1 days);

        campaigns[campaignId] = Campaign({
            id: campaignId,
            creator: msg.sender,
            title: _title,
            description: _description,
            category: _category,
            goal: _goal,
            raised: 0,
            deadline: deadline,
            isActive: true,
            goalReached: false,
            fundsWithdrawn: false
        });

        userCampaigns[msg.sender].push(campaignId);
        totalCampaigns++;

        emit CampaignCreated(campaignId, msg.sender, _title, _goal, deadline);
        return campaignId;
    }

    function donate(uint256 _campaignId, bool _isAnonymous) 
        external 
        payable 
        campaignExists(_campaignId) 
        campaignActive(_campaignId) 
    {
        require(msg.value > 0, "Donation must be greater than 0");
        
        Campaign storage campaign = campaigns[_campaignId];
        campaign.raised += msg.value;

        // Check if goal is reached
        if (campaign.raised >= campaign.goal && !campaign.goalReached) {
            campaign.goalReached = true;
        }

        // Record donation
        Donation memory newDonation = Donation({
            campaignId: _campaignId,
            donor: _isAnonymous ? address(0) : msg.sender,
            amount: msg.value,
            timestamp: block.timestamp,
            isAnonymous: _isAnonymous
        });

        campaignDonations[_campaignId].push(newDonation);
        if (!_isAnonymous) {
            userDonations[msg.sender].push(_campaignId);
        }
        totalDonations++;

        emit DonationMade(_campaignId, _isAnonymous ? address(0) : msg.sender, msg.value, _isAnonymous);
    }

    function withdrawFunds(uint256 _campaignId) 
        external 
        campaignExists(_campaignId) 
        onlyCampaignCreator(_campaignId) 
    {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.goalReached, "Goal not reached");
        require(!campaign.fundsWithdrawn, "Funds already withdrawn");
        require(campaign.raised > 0, "No funds to withdraw");

        campaign.fundsWithdrawn = true;
        campaign.isActive = false;

        // Calculate platform fee (1%)
        uint256 fee = (campaign.raised * platformFee) / 1000;
        uint256 withdrawAmount = campaign.raised - fee;

        // Transfer funds to creator
        payable(msg.sender).transfer(withdrawAmount);

        emit FundsWithdrawn(_campaignId, msg.sender, withdrawAmount);
    }

    function refund(uint256 _campaignId) external campaignExists(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(block.timestamp >= campaign.deadline, "Campaign still active");
        require(!campaign.goalReached, "Goal was reached");
        require(!campaign.fundsWithdrawn, "Funds already withdrawn");

        uint256 refundAmount = 0;
        Donation[] storage donations = campaignDonations[_campaignId];

        // Find user's donations and calculate refund
        for (uint256 i = 0; i < donations.length; i++) {
            if (donations[i].donor == msg.sender) {
                refundAmount += donations[i].amount;
                donations[i].amount = 0; // Mark as refunded
            }
        }

        require(refundAmount > 0, "No donations to refund");

        campaign.raised -= refundAmount;
        payable(msg.sender).transfer(refundAmount);

        emit RefundIssued(_campaignId, msg.sender, refundAmount);
    }

    function getCampaign(uint256 _campaignId) 
        external 
        view 
        campaignExists(_campaignId) 
        returns (Campaign memory) 
    {
        return campaigns[_campaignId];
    }

    function getCampaignDonations(uint256 _campaignId) 
        external 
        view 
        campaignExists(_campaignId) 
        returns (Donation[] memory) 
    {
        return campaignDonations[_campaignId];
    }

    function getUserCampaigns(address _user) external view returns (uint256[] memory) {
        return userCampaigns[_user];
    }

    function getUserDonations(address _user) external view returns (uint256[] memory) {
        return userDonations[_user];
    }

    function getAllActiveCampaigns() external view returns (Campaign[] memory) {
        uint256 activeCount = 0;
        
        // Count active campaigns
        for (uint256 i = 0; i < campaignCounter; i++) {
            if (campaigns[i].isActive && block.timestamp < campaigns[i].deadline) {
                activeCount++;
            }
        }
        
        Campaign[] memory activeCampaigns = new Campaign[](activeCount);
        uint256 index = 0;
        
        // Populate active campaigns
        for (uint256 i = 0; i < campaignCounter; i++) {
            if (campaigns[i].isActive && block.timestamp < campaigns[i].deadline) {
                activeCampaigns[index] = campaigns[i];
                index++;
            }
        }
        
        return activeCampaigns;
    }

    function getCampaignsByCategory(string memory _category) 
        external 
        view 
        returns (Campaign[] memory) 
    {
        uint256 count = 0;
        
        // Count campaigns in category
        for (uint256 i = 0; i < campaignCounter; i++) {
            if (keccak256(bytes(campaigns[i].category)) == keccak256(bytes(_category)) && 
                campaigns[i].isActive && 
                block.timestamp < campaigns[i].deadline) {
                count++;
            }
        }
        
        Campaign[] memory categoryCampaigns = new Campaign[](count);
        uint256 index = 0;
        
        // Populate category campaigns
        for (uint256 i = 0; i < campaignCounter; i++) {
            if (keccak256(bytes(campaigns[i].category)) == keccak256(bytes(_category)) && 
                campaigns[i].isActive && 
                block.timestamp < campaigns[i].deadline) {
                categoryCampaigns[index] = campaigns[i];
                index++;
            }
        }
        
        return categoryCampaigns;
    }

    function emergencyPause(uint256 _campaignId) 
        external 
        campaignExists(_campaignId) 
        onlyCampaignCreator(_campaignId) 
    {
        campaigns[_campaignId].isActive = false;
    }

    function getContractStats() external view returns (
        uint256 _totalCampaigns,
        uint256 _totalDonations,
        uint256 _platformFee
    ) {
        return (totalCampaigns, totalDonations, platformFee);
    }

    // Allow contract to receive ETH
    receive() external payable {}
    fallback() external payable {}
}