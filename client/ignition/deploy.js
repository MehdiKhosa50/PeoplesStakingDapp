const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy RewardToken
  const RewardToken = await hre.ethers.getContractFactory("RewardToken");
  const rewardToken = await RewardToken.deploy(deployer.address);
  await rewardToken.waitForDeployment();
  console.log("RewardToken deployed to:", await rewardToken.getAddress());

  // Mint RewardToken supply (example: 1,000,000 tokens)
  const rewardTokenAmount = hre.ethers.parseUnits("1000000", 18); // 1 million tokens with 18 decimals
  await rewardToken.mint(deployer.address, rewardTokenAmount);
  console.log(`Minted ${rewardTokenAmount.toString()} RewardTokens to deployer`);

  // Deploy StakedToken
  const StakedToken = await hre.ethers.getContractFactory("StakedToken");
  const stakedToken = await StakedToken.deploy(deployer.address);
  await stakedToken.waitForDeployment();
  console.log("StakedToken deployed to:", await stakedToken.getAddress());

  // Mint StakedToken supply (example: 500,000 tokens)
  const stakedTokenAmount = hre.ethers.parseUnits("500000", 18); // 500k tokens with 18 decimals
  await stakedToken.mint(deployer.address, stakedTokenAmount);
  console.log(`Minted ${stakedTokenAmount.toString()} StakedTokens to deployer`);

  // Deploy Staking contract
  const Staking = await hre.ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(
    await rewardToken.getAddress(),
    await stakedToken.getAddress()
  );
  await staking.waitForDeployment();
  console.log("Staking contract deployed to:", await staking.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
