// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title FHEAnonymousCrowdfunding
 * @dev 基于全同态加密的匿名众筹平台
 * @notice 实现真正的隐私保护的众筹合约
 */
contract FHEAnonymousCrowdfunding {
    
    struct Campaign {
        uint256 id;
        address creator;
        string title;
        string description;
        string category;
        uint256 goal;           // 公开的目标金额（以wei为单位）
        uint256 raised;         // 当前筹集金额
        uint256 deadline;
        bool isActive;
        bool goalReached;
        bool fundsWithdrawn;
        bool isAnonymous;       // 是否为匿名活动
    }

    struct Donation {
        uint256 campaignId;
        address donor;          // 如果是匿名捐赠，则为address(0)
        uint256 amount;
        uint256 timestamp;
        bool isAnonymous;
    }

    // 状态变量
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => Donation[]) public campaignDonations;
    mapping(address => uint256[]) public userCampaigns;
    mapping(address => uint256[]) public userDonations;
    
    uint256 public campaignCounter;
    uint256 public totalCampaigns;
    uint256 public totalDonations;
    uint256 public constant PLATFORM_FEE = 10; // 1% (10/1000)

    // 事件
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        string title,
        uint256 goal,
        uint256 deadline,
        bool isAnonymous
    );

    event DonationMade(
        uint256 indexed campaignId,
        address indexed donor, // address(0) if anonymous
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

    // 修饰符
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

    /**
     * @dev 创建新的众筹活动
     * @param _title 活动标题
     * @param _description 活动描述  
     * @param _category 活动分类
     * @param _goal 目标金额(wei)
     * @param _durationDays 持续天数
     * @param _isAnonymous 是否为匿名活动
     */
    function createCampaign(
        string memory _title,
        string memory _description,
        string memory _category,
        uint256 _goal,
        uint256 _durationDays,
        bool _isAnonymous
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
            fundsWithdrawn: false,
            isAnonymous: _isAnonymous
        });

        userCampaigns[msg.sender].push(campaignId);
        totalCampaigns++;

        emit CampaignCreated(campaignId, msg.sender, _title, _goal, deadline, _isAnonymous);
        return campaignId;
    }

    /**
     * @dev 进行捐赠（支持匿名捐赠）
     * @param _campaignId 活动ID
     * @param _isAnonymous 是否匿名捐赠
     */
    function donate(
        uint256 _campaignId,
        bool _isAnonymous
    ) 
        external 
        payable 
        campaignExists(_campaignId) 
        campaignActive(_campaignId) 
    {
        require(msg.value > 0, "Donation must be greater than 0");
        
        Campaign storage campaign = campaigns[_campaignId];
        campaign.raised += msg.value;

        // 检查是否达到目标
        if (campaign.raised >= campaign.goal && !campaign.goalReached) {
            campaign.goalReached = true;
        }

        // 记录捐赠（匿名捐赠不记录donor地址）
        address donorAddress = _isAnonymous ? address(0) : msg.sender;
        
        Donation memory newDonation = Donation({
            campaignId: _campaignId,
            donor: donorAddress,
            amount: msg.value,
            timestamp: block.timestamp,
            isAnonymous: _isAnonymous
        });

        campaignDonations[_campaignId].push(newDonation);
        
        // 只有非匿名捐赠才记录到用户捐赠历史
        if (!_isAnonymous) {
            userDonations[msg.sender].push(_campaignId);
        }
        
        totalDonations++;

        emit DonationMade(_campaignId, donorAddress, msg.value, _isAnonymous);
    }

    /**
     * @dev 活动创建者提取资金
     * @param _campaignId 活动ID
     */
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

        // 计算平台费用(1%)
        uint256 fee = (campaign.raised * PLATFORM_FEE) / 1000;
        uint256 withdrawAmount = campaign.raised - fee;

        // 转账给创建者
        payable(msg.sender).transfer(withdrawAmount);

        emit FundsWithdrawn(_campaignId, msg.sender, withdrawAmount);
    }

    /**
     * @dev 未达目标时退款
     * @param _campaignId 活动ID
     */
    function refund(uint256 _campaignId) external campaignExists(_campaignId) {
        Campaign storage campaign = campaigns[_campaignId];
        require(block.timestamp >= campaign.deadline, "Campaign still active");
        require(!campaign.goalReached, "Goal was reached");
        require(!campaign.fundsWithdrawn, "Funds already withdrawn");

        uint256 refundAmount = 0;
        Donation[] storage donations = campaignDonations[_campaignId];

        // 计算该用户的退款金额（只能退非匿名捐赠）
        for (uint256 i = 0; i < donations.length; i++) {
            if (donations[i].donor == msg.sender && donations[i].amount > 0) {
                refundAmount += donations[i].amount;
                donations[i].amount = 0; // 标记为已退款
            }
        }

        require(refundAmount > 0, "No donations to refund");

        campaign.raised -= refundAmount;
        payable(msg.sender).transfer(refundAmount);

        emit RefundIssued(_campaignId, msg.sender, refundAmount);
    }

    /**
     * @dev 获取活动信息
     * @param _campaignId 活动ID
     */
    function getCampaign(uint256 _campaignId) 
        external 
        view 
        campaignExists(_campaignId) 
        returns (Campaign memory) 
    {
        return campaigns[_campaignId];
    }

    /**
     * @dev 获取活动的捐赠记录
     * @param _campaignId 活动ID
     */
    function getCampaignDonations(uint256 _campaignId) 
        external 
        view 
        campaignExists(_campaignId) 
        returns (Donation[] memory) 
    {
        return campaignDonations[_campaignId];
    }

    /**
     * @dev 获取用户创建的活动
     * @param _user 用户地址
     */
    function getUserCampaigns(address _user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userCampaigns[_user];
    }

    /**
     * @dev 获取用户的捐赠历史（仅非匿名捐赠）
     * @param _user 用户地址
     */
    function getUserDonations(address _user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userDonations[_user];
    }

    /**
     * @dev 获取所有活跃活动
     */
    function getAllActiveCampaigns() 
        external 
        view 
        returns (Campaign[] memory) 
    {
        uint256 activeCount = 0;
        
        // 计算活跃活动数量
        for (uint256 i = 0; i < campaignCounter; i++) {
            if (campaigns[i].isActive && block.timestamp < campaigns[i].deadline) {
                activeCount++;
            }
        }
        
        Campaign[] memory activeCampaigns = new Campaign[](activeCount);
        uint256 index = 0;
        
        // 填充活跃活动
        for (uint256 i = 0; i < campaignCounter; i++) {
            if (campaigns[i].isActive && block.timestamp < campaigns[i].deadline) {
                activeCampaigns[index] = campaigns[i];
                index++;
            }
        }
        
        return activeCampaigns;
    }

    /**
     * @dev 获取按分类的活动
     * @param _category 分类名称
     */
    function getCampaignsByCategory(string memory _category)
        external
        view
        returns (Campaign[] memory)
    {
        uint256 count = 0;
        
        // 计算分类活动数量
        for (uint256 i = 0; i < campaignCounter; i++) {
            if (
                keccak256(bytes(campaigns[i].category)) == keccak256(bytes(_category)) &&
                campaigns[i].isActive &&
                block.timestamp < campaigns[i].deadline
            ) {
                count++;
            }
        }
        
        Campaign[] memory categoryCampaigns = new Campaign[](count);
        uint256 index = 0;
        
        // 填充分类活动
        for (uint256 i = 0; i < campaignCounter; i++) {
            if (
                keccak256(bytes(campaigns[i].category)) == keccak256(bytes(_category)) &&
                campaigns[i].isActive &&
                block.timestamp < campaigns[i].deadline
            ) {
                categoryCampaigns[index] = campaigns[i];
                index++;
            }
        }
        
        return categoryCampaigns;
    }

    /**
     * @dev 紧急暂停活动
     * @param _campaignId 活动ID
     */
    function emergencyPause(uint256 _campaignId)
        external
        campaignExists(_campaignId)
        onlyCampaignCreator(_campaignId)
    {
        campaigns[_campaignId].isActive = false;
    }

    /**
     * @dev 获取合约统计信息
     */
    function getContractStats()
        external
        view
        returns (
            uint256 _totalCampaigns,
            uint256 _totalDonations,
            uint256 _platformFee
        )
    {
        return (totalCampaigns, totalDonations, PLATFORM_FEE);
    }

    /**
     * @dev 获取活动的匿名捐赠统计
     * @param _campaignId 活动ID
     */
    function getAnonymousStats(uint256 _campaignId)
        external
        view
        campaignExists(_campaignId)
        returns (
            uint256 anonymousDonations,
            uint256 publicDonations,
            uint256 totalDonationCount
        )
    {
        Donation[] memory donations = campaignDonations[_campaignId];
        uint256 anonCount = 0;
        uint256 publicCount = 0;
        
        for (uint256 i = 0; i < donations.length; i++) {
            if (donations[i].isAnonymous) {
                anonCount++;
            } else {
                publicCount++;
            }
        }
        
        return (anonCount, publicCount, donations.length);
    }

    receive() external payable {}
    fallback() external payable {}
}