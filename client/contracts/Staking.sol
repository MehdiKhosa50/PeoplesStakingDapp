// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Staking {
    using SafeMath for uint256;

    IERC20 public Reward_Token;
    IERC20 public Staked_Token;
    uint256 public constant Reward_Rate = 10; // 10 tokens per second

    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public StakedBalance;
    uint256 public TotalStakedTokens;

    event Staked(address indexed user, uint256 amount);
    event Withdrwal(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 reward);

    constructor(address _rewardToken, address _stakedToken) {
        Reward_Token = IERC20(_rewardToken);
        Staked_Token = IERC20(_stakedToken);
    }

    function rewardPerToken() public view returns (uint256) {
        if (TotalStakedTokens == 0) {
            return rewardPerTokenStored;
        }
        return
            rewardPerTokenStored.add(
                (
                    (block.timestamp.sub(lastUpdateTime)).mul(Reward_Rate).mul(
                        1e18
                    )
                ).div(TotalStakedTokens)
            );
    }

    function earned(address account) public view returns (uint256) {
        return
            StakedBalance[account]
                .mul(rewardPerToken().sub(userRewardPerTokenPaid[account]))
                .div(1e18)
                .add(rewards[account]);
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    function Stake(uint256 _amount) external updateReward(msg.sender) {
        require(_amount > 0, "Stake amount must be greater than 0");
        TotalStakedTokens = TotalStakedTokens.add(_amount);
        StakedBalance[msg.sender] = StakedBalance[msg.sender].add(_amount);
        bool success = Staked_Token.transferFrom(
            msg.sender,
            address(this),
            _amount
        );
        require(success, "Token transfer failed");
        emit Staked(msg.sender, _amount);
    }

    function Withdraw(uint256 _amount) external updateReward(msg.sender) {
        require(_amount > 0, "Withdrwal amount must be greater than 0");
        require(
            StakedBalance[msg.sender] >= _amount,
            "Insufficient staked balance"
        );
        TotalStakedTokens = TotalStakedTokens.sub(_amount);
        StakedBalance[msg.sender] = StakedBalance[msg.sender].sub(_amount);
        bool success = Staked_Token.transfer(msg.sender, _amount);
        require(success, "Token transfer failed");
        emit Withdrwal(msg.sender, _amount);
    }

    function ClaimReward() external updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        require(reward > 0, "No rewards to claim");
        rewards[msg.sender] = 0;
        bool success = Reward_Token.transfer(msg.sender, reward);
        require(success, "Token transfer failed");
        emit RewardClaimed(msg.sender, reward);
    }
}
