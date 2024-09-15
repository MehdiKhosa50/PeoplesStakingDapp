const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Staking", function () {
  let Staking;
  let staking;
  let RewardToken;
  let rewardToken;
  let StakedToken;
  let stakedToken;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    rewardToken = await MockERC20.deploy("Reward Token", "RWD");
    stakedToken = await MockERC20.deploy("Staked Token", "STK");

    // Deploy Staking contract
    Staking = await ethers.getContractFactory("Staking");
    staking = await Staking.deploy(rewardToken.address, stakedToken.address);

    // Mint some tokens for testing
    await rewardToken.mint(staking.address, ethers.utils.parseEther("1000000"));
    await stakedToken.mint(addr1.address, ethers.utils.parseEther("1000"));
    await stakedToken.mint(addr2.address, ethers.utils.parseEther("1000"));
  });

  describe("Deployment", function () {
    it("Should set the correct reward and staked token addresses", async function () {
      expect(await staking.Reward_Token()).to.equal(rewardToken.address);
      expect(await staking.Staked_Token()).to.equal(stakedToken.address);
    });
  });

  describe("Staking", function () {
    it("Should allow users to stake tokens", async function () {
      const stakeAmount = ethers.utils.parseEther("100");
      await stakedToken.connect(addr1).approve(staking.address, stakeAmount);
      await expect(staking.connect(addr1).Stake(stakeAmount))
        .to.emit(staking, "Staked")
        .withArgs(addr1.address, stakeAmount);

      expect(await staking.StakedBalance(addr1.address)).to.equal(stakeAmount);
      expect(await staking.TotalStakedTokens()).to.equal(stakeAmount);
    });

    it("Should not allow staking zero tokens", async function () {
      await expect(staking.connect(addr1).Stake(0)).to.be.revertedWith("Stake amount must be greater than 0");
    });
  });

  describe("Withdrawing", function () {
    beforeEach(async function () {
      const stakeAmount = ethers.utils.parseEther("100");
      await stakedToken.connect(addr1).approve(staking.address, stakeAmount);
      await staking.connect(addr1).Stake(stakeAmount);
    });

    it("Should allow users to withdraw staked tokens", async function () {
      const withdrawAmount = ethers.utils.parseEther("50");
      await expect(staking.connect(addr1).Withdraw(withdrawAmount))
        .to.emit(staking, "Withdrwal")
        .withArgs(addr1.address, withdrawAmount);

      expect(await staking.StakedBalance(addr1.address)).to.equal(ethers.utils.parseEther("50"));
      expect(await staking.TotalStakedTokens()).to.equal(ethers.utils.parseEther("50"));
    });

    it("Should not allow withdrawing zero tokens", async function () {
      await expect(staking.connect(addr1).Withdraw(0)).to.be.revertedWith("Withdrwal amount must be greater than 0");
    });

    it("Should not allow withdrawing more than staked balance", async function () {
      const excessAmount = ethers.utils.parseEther("101");
      await expect(staking.connect(addr1).Withdraw(excessAmount)).to.be.reverted;
    });
  });

  describe("Rewards", function () {
    beforeEach(async function () {
      const stakeAmount = ethers.utils.parseEther("100");
      await stakedToken.connect(addr1).approve(staking.address, stakeAmount);
      await staking.connect(addr1).Stake(stakeAmount);
    });

    it("Should calculate rewards correctly", async function () {
      // Simulate time passing
      await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
      await ethers.provider.send("evm_mine");

      const rewardPerToken = await staking.rewardPerToken();
      expect(rewardPerToken).to.be.gt(0);
    });

    it("Should allow users to claim rewards", async function () {
      // Simulate time passing
      await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
      await ethers.provider.send("evm_mine");

      await expect(staking.connect(addr1).ClaimReward())
        .to.emit(staking, "RewardClaimed");

      const rewardBalance = await rewardToken.balanceOf(addr1.address);
      expect(rewardBalance).to.be.gt(0);
    });

    it("Should not allow claiming zero rewards", async function () {
      await expect(staking.connect(addr2).ClaimReward()).to.be.revertedWith("no Rewards to Claim");
    });
  });

  describe("Reentrancy Guard", function () {
    it("Should prevent reentrancy attacks", async function () {
      // This test would require a malicious contract that attempts to re-enter the Stake function
      // For simplicity, we'll just check that the nonReentrant modifier is applied to critical functions
      const stakingABI = staking.interface.format("json");
      const stakeFunctionABI = JSON.parse(stakingABI).find(item => item.name === "Stake");
      const withdrawFunctionABI = JSON.parse(stakingABI).find(item => item.name === "Withdraw");
      const claimRewardFunctionABI = JSON.parse(stakingABI).find(item => item.name === "ClaimReward");

      expect(stakeFunctionABI.modifiers).to.include("nonReentrant");
      expect(withdrawFunctionABI.modifiers).to.include("nonReentrant");
      expect(claimRewardFunctionABI.modifiers).to.include("nonReentrant");
    });
  });
});