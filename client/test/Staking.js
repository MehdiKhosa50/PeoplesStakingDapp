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

    // Deploy token contracts
    RewardToken = await ethers.getContractFactory("RewardToken");
    rewardToken = await RewardToken.deploy(owner.address);

    StakedToken = await ethers.getContractFactory("StakedToken");
    stakedToken = await StakedToken.deploy(owner.address);

    // Deploy Staking contract
    Staking = await ethers.getContractFactory("Staking");
    staking = await Staking.deploy(await rewardToken.getAddress(), await stakedToken.getAddress());

    // Mint additional tokens for testing
    await rewardToken.mint(await staking.getAddress(), ethers.parseUnits("1000000", 18));
    await stakedToken.mint(addr1.address, ethers.parseUnits("1000", 18));
    await stakedToken.mint(addr2.address, ethers.parseUnits("1000", 18));

    // Approve staking contract to spend tokens
    await stakedToken.connect(addr1).approve(await staking.getAddress(), ethers.parseUnits("1000", 18));
    await stakedToken.connect(addr2).approve(await staking.getAddress(), ethers.parseUnits("1000", 18));
  });

  describe("Deployment", function () {
    it("Should set the correct reward and staked token addresses", async function () {
      expect(await staking.Reward_Token()).to.equal(await rewardToken.getAddress());
      expect(await staking.Staked_Token()).to.equal(await stakedToken.getAddress());
    });

    it("Should set the correct Reward_Rate", async function () {
      expect(await staking.Reward_Rate()).to.equal(10);
    });
  });

  describe("Staking", function () {
    it("Should allow users to stake tokens", async function () {
      const stakeAmount = ethers.parseUnits("100", 18);
      await expect(staking.connect(addr1).Stake(stakeAmount))
        .to.emit(staking, "Staked")
        .withArgs(addr1.address, stakeAmount);

      expect(await staking.StakedBalance(addr1.address)).to.equal(stakeAmount);
      expect(await staking.TotalStakedTokens()).to.equal(stakeAmount);
    });

    it("Should not allow staking zero tokens", async function () {
      await expect(staking.connect(addr1).Stake(0)).to.be.revertedWith("Stake amount must be greater than 0");
    });

    it("Should fail if user doesn't have enough tokens", async function () {
      const largeAmount = ethers.parseUnits("10000", 18);
      await expect(staking.connect(addr1).Stake(largeAmount)).to.be.reverted;
    });
  });

  describe("Withdrawing", function () {
    beforeEach(async function () {
      const stakeAmount = ethers.parseUnits("100", 18);
      await staking.connect(addr1).Stake(stakeAmount);
    });

    it("Should allow users to withdraw staked tokens", async function () {
      const withdrawAmount = ethers.parseUnits("50", 18);
      await expect(staking.connect(addr1).Withdraw(withdrawAmount))
        .to.emit(staking, "Withdrwal")
        .withArgs(addr1.address, withdrawAmount);

      expect(await staking.StakedBalance(addr1.address)).to.equal(ethers.parseUnits("50", 18));
      expect(await staking.TotalStakedTokens()).to.equal(ethers.parseUnits("50", 18));
    });

    it("Should not allow withdrawing zero tokens", async function () {
      await expect(staking.connect(addr1).Withdraw(0)).to.be.revertedWith("Withdrwal amount must be greater than 0");
    });

    it("Should not allow withdrawing more than staked balance", async function () {
      const excessAmount = ethers.parseUnits("101", 18);
      await expect(staking.connect(addr1).Withdraw(excessAmount)).to.be.revertedWith("Insufficient staked balance");
    });
  });

  describe("Rewards", function () {
    beforeEach(async function () {
      const stakeAmount = ethers.parseUnits("100", 18);
      await staking.connect(addr1).Stake(stakeAmount);
    });

    it("Should calculate rewards correctly", async function () {
      await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
      await ethers.provider.send("evm_mine");

      const rewardPerToken = await staking.rewardPerToken();
      expect(rewardPerToken).to.be.gt(0);
    });

    it("Should allow users to claim rewards", async function () {
      await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
      await ethers.provider.send("evm_mine");

      await expect(staking.connect(addr1).ClaimReward())
        .to.emit(staking, "RewardClaimed");

      const rewardBalance = await rewardToken.balanceOf(addr1.address);
      expect(rewardBalance).to.be.gt(0);
    });

    it("Should not allow claiming zero rewards", async function () {
      await expect(staking.connect(addr2).ClaimReward()).to.be.revertedWith("No rewards to claim");
    });

    it("Should update rewards correctly after multiple stakes and withdrawals", async function () {
      // Stake more
      await staking.connect(addr1).Stake(ethers.parseUnits("50", 18));

      await ethers.provider.send("evm_increaseTime", [1800]); // 30 minutes
      await ethers.provider.send("evm_mine");

      // Withdraw some
      await staking.connect(addr1).Withdraw(ethers.parseUnits("75", 18));

      await ethers.provider.send("evm_increaseTime", [1800]); // 30 minutes
      await ethers.provider.send("evm_mine");

      await staking.connect(addr1).ClaimReward();
      const rewardBalance = await rewardToken.balanceOf(addr1.address);
      expect(rewardBalance).to.be.gt(0);
    });
  });

  describe("Edge cases", function () {
    it("Should handle multiple users staking and claiming correctly", async function () {
      await staking.connect(addr1).Stake(ethers.parseUnits("100", 18));
      await staking.connect(addr2).Stake(ethers.parseUnits("200", 18));

      await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
      await ethers.provider.send("evm_mine");

      await staking.connect(addr1).ClaimReward();
      await staking.connect(addr2).ClaimReward();

      const reward1 = await rewardToken.balanceOf(addr1.address);
      const reward2 = await rewardToken.balanceOf(addr2.address);

      expect(reward2).to.be.gt(reward1);
    });

    it("Should handle staking, withdrawing, and re-staking correctly", async function () {
      await staking.connect(addr1).Stake(ethers.parseUnits("100", 18));

      await ethers.provider.send("evm_increaseTime", [1800]); // 30 minutes
      await ethers.provider.send("evm_mine");

      await staking.connect(addr1).Withdraw(ethers.parseUnits("50", 18));

      await ethers.provider.send("evm_increaseTime", [1800]); // 30 minutes
      await ethers.provider.send("evm_mine");

      await staking.connect(addr1).Stake(ethers.parseUnits("200", 18));

      await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
      await ethers.provider.send("evm_mine");

      await staking.connect(addr1).ClaimReward();

      const rewardBalance = await rewardToken.balanceOf(addr1.address);
      expect(rewardBalance).to.be.gt(0);
    });
  });
});