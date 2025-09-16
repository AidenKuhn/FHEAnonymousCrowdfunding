// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract BasicCrowdfunding {
    struct Campaign {
        address creator;
        string title;
        uint256 goal;
        uint256 raised;
        uint256 deadline;
        bool isActive;
    }

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public donations;
    
    uint256 public campaignCounter;
    uint256 public constant PLATFORM_FEE = 10; // 1% in basis points (10/1000)

    event CampaignCreated(uint256 indexed id, address creator, uint256 goal);
    event DonationMade(uint256 indexed id, address donor, uint256 amount);
    event FundsWithdrawn(uint256 indexed id, uint256 amount);

    function createCampaign(
        string calldata _title,
        uint256 _goal,
        uint256 _durationDays
    ) external returns (uint256) {
        require(_goal > 0, "Invalid goal");
        require(_durationDays > 0 && _durationDays <= 90, "Invalid duration");
        
        uint256 id = campaignCounter++;
        campaigns[id] = Campaign({
            creator: msg.sender,
            title: _title,
            goal: _goal,
            raised: 0,
            deadline: block.timestamp + (_durationDays * 1 days),
            isActive: true
        });

        emit CampaignCreated(id, msg.sender, _goal);
        return id;
    }

    function donate(uint256 _id) external payable {
        Campaign storage campaign = campaigns[_id];
        require(campaign.isActive, "Campaign not active");
        require(block.timestamp < campaign.deadline, "Campaign ended");
        require(msg.value > 0, "Invalid amount");

        campaign.raised += msg.value;
        donations[_id][msg.sender] += msg.value;

        emit DonationMade(_id, msg.sender, msg.value);
    }

    function withdrawFunds(uint256 _id) external {
        Campaign storage campaign = campaigns[_id];
        require(campaign.creator == msg.sender, "Not creator");
        require(campaign.raised >= campaign.goal, "Goal not reached");
        require(campaign.isActive, "Already withdrawn");

        campaign.isActive = false;
        uint256 fee = (campaign.raised * PLATFORM_FEE) / 1000;
        uint256 amount = campaign.raised - fee;

        payable(msg.sender).transfer(amount);
        emit FundsWithdrawn(_id, amount);
    }

    function getCampaign(uint256 _id) external view returns (
        address creator,
        string memory title,
        uint256 goal,
        uint256 raised,
        uint256 deadline,
        bool isActive
    ) {
        Campaign storage c = campaigns[_id];
        return (c.creator, c.title, c.goal, c.raised, c.deadline, c.isActive);
    }

    function getActiveCampaigns() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < campaignCounter; i++) {
            if (campaigns[i].isActive && block.timestamp < campaigns[i].deadline) {
                count++;
            }
        }
        
        uint256[] memory active = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < campaignCounter; i++) {
            if (campaigns[i].isActive && block.timestamp < campaigns[i].deadline) {
                active[index++] = i;
            }
        }
        return active;
    }
}