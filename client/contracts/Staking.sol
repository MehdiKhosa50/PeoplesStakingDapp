// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Staking {

    IERC20 public Reward_Token;
    IERC20 public Staked_Token; 

    uint public constant Reward_Rate = 10;
    uint public TotalStakedTokens;
    uint public lastTimeStamp;
    uint public rewardPerTokenStored;

    mapping (address => uint) public StakedBalance;
    mapping (address => uint) public userRewardPerTokenPaid;
    mapping (address => uint) public rewards;

    event Staked(address indexed user, uint256 indexed amount);
    event Withdrwal(address indexed user, uint256 indexed amount);
    event RewardClaimed(address indexed user, uint256 indexed amount);

    constructor(address _reward_Token , address _staked_Token ) {
        Reward_Token = IERC20(_reward_Token) ;
        Staked_Token = IERC20(_staked_Token) ; 
    }

    function rewardPerToken() public view returns(uint) {
        if(TotalStakedTokens == 0) {
            return rewardPerTokenStored;
        }
        uint totalTime = block.timestamp - lastTimeStamp ;
        uint totalRewards = Reward_Rate * totalTime;
        return rewardPerTokenStored + totalRewards / TotalStakedTokens;
    }

    function earned(address account) private view returns (uint) {
        return((StakedBalance[account] * (rewardPerToken() - userRewardPerTokenPaid[account]))) ;
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastTimeStamp = block.timestamp;
        rewards[account] = earned(account);
        userRewardPerTokenPaid[account] = rewardPerTokenStored;
        _;
    }

    function Stake(uint amount) external updateReward(msg.sender) {
        require(amount > 0, 'Stake amount must be greater than 0');
        TotalStakedTokens += amount;
        StakedBalance[msg.sender] += amount;
        emit Staked(msg.sender, amount);

        bool success = Staked_Token.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer Failed!");
    }

    function Withdraw(uint amount) external updateReward(msg.sender) {
        require(amount > 0, 'Withdrwal amount must be greater than 0');
        TotalStakedTokens -= amount;
        StakedBalance[msg.sender] -= amount;
        emit Withdrwal(msg.sender, amount);

        bool success = Staked_Token.transfer(msg.sender, amount);
        require(success, "Transfer Failed!");
    }

    function ClaimReward() external updateReward(msg.sender) {
        uint reward = rewards[msg.sender];
        require(reward > 0, 'no Rewards to Claim');
        rewards[msg.sender] = 0;
        emit RewardClaimed(msg.sender, reward);

        bool success = Reward_Token.transfer(msg.sender, reward);
        require(success, "Claiming Reward Failed!");
    }
}