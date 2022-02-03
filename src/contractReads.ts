import { ethers } from 'ethers';
import { WrapperBuilder } from 'redstone-evm-connector';
import { get } from 'svelte/store';
import { provider, signer, signerAddress} from 'svelte-ethers-store';

import { checkContractCallPrereqs } from './utils';
import { reserveTokenID, backedTokenID } from './constants';
import { 
	userWETHAllowance,
	userWETHBalance,
	userWETHDepositBalance,
	userWETHMaxWithdrawal,
	userXOCAllowance,
	userXOCBalance,
	userXOCMintingPower,
	userXOCDebt,
	WETHToXOC,
	userHealthRatio,
	liquidationThreshold,
	collateralRatioParam
} from './store/contractData';
import {
	mockWETHABI,
	mockWETHAddress,
	houseOfReserveABI,
	houseOfReserveAddress,
	houseOfCoinAddress,
	houseOfCoinABI,
	assetsAccountantAddress,
	assetsAccountantABI,
	XOCAddress,
	XOCABI
} from './abis';

async function getWETHtoXOCRate() {
	checkContractCallPrereqs();

	const houseOfCoinContract = new ethers.Contract(houseOfCoinAddress, houseOfCoinABI, get(signer));
	const wrappedContract = WrapperBuilder.wrapLite(houseOfCoinContract).usingPriceFeed('redstone-stocks');

	// returned price has 8 decimals
	const price = await wrappedContract.redstoneGetLastPrice();
	WETHToXOC.set(price);
}

export async function getWETHAllowance() {
	checkContractCallPrereqs();
	const mockWETHContract = new ethers.Contract(mockWETHAddress, mockWETHABI, get(provider));
	const allowance = await mockWETHContract.allowance(get(signerAddress), houseOfReserveAddress);
	userWETHAllowance.set(allowance);
}


export async function getUserWETHBalance(): Promise<void> {
	checkContractCallPrereqs();
	const mockWETHContract = new ethers.Contract(mockWETHAddress, mockWETHABI, get(provider));
	const balance = await mockWETHContract.balanceOf(get(signerAddress));
	userWETHBalance.set(balance);
}


async function getUserWETHDepositBalance(): Promise<void> {
	checkContractCallPrereqs();
	const assetsAccountantContract = new ethers.Contract(assetsAccountantAddress, assetsAccountantABI, get(provider));
	const fetchedBalance = await assetsAccountantContract.balanceOf(get(signerAddress), reserveTokenID);
	userWETHDepositBalance.set(fetchedBalance);
}

async function getMaxWETHWithdrawal() {
	checkContractCallPrereqs();
	const houseOfReserveContract = new ethers.Contract(houseOfReserveAddress, houseOfReserveABI, get(signer));
	const wrappedContract = WrapperBuilder.wrapLite(houseOfReserveContract).usingPriceFeed('redstone-stocks');
	const fetchedAmount = await wrappedContract.checkMaxWithdrawal(get(signerAddress));
	userWETHMaxWithdrawal.set(fetchedAmount);
}


async function getXOCBalance() {
	checkContractCallPrereqs();
	const XOCContract = new ethers.Contract(XOCAddress, XOCABI, get(provider));
	const fetchedBalance = await XOCContract.balanceOf(get(signerAddress));
	userXOCBalance.set(fetchedBalance);
}

async function getXOCMintingPower() {
	const houseOfCoinContract = new ethers.Contract(houseOfCoinAddress, houseOfCoinABI, get(signer));
	const wrappedContract = WrapperBuilder.wrapLite(houseOfCoinContract).usingPriceFeed('redstone-stocks');
	const fetchedAmount = await wrappedContract.checkRemainingMintingPower(get(signerAddress), mockWETHAddress);
	userXOCMintingPower.set(fetchedAmount);
}

export async function getXOCAllowance() {
	const XOCContract = new ethers.Contract(XOCAddress, XOCABI, get(provider));
	const allowance = await XOCContract.allowance(get(signerAddress), houseOfCoinAddress);
	userXOCAllowance.set(allowance);
}

export async function getXOCDebt() {
	const assetsAccountantContract = new ethers.Contract(assetsAccountantAddress, assetsAccountantABI, get(provider));
	const fetchedBalance = await assetsAccountantContract.balanceOf(get(signerAddress), backedTokenID);
	userXOCDebt.set(fetchedBalance);
}

export async function getHealthRatio() {
	const houseOfCoinContract = new ethers.Contract(houseOfCoinAddress, houseOfCoinABI, get(signer));
	const wrappedContract = WrapperBuilder.wrapLite(houseOfCoinContract).usingPriceFeed('redstone-stocks');
	// contract revers if no WETH deposits or no debt
	const deposit = get(userWETHDepositBalance);
	const debt = get(userXOCDebt);
	if (deposit && deposit.gt(0) && debt && debt.gt(0)) {
		const fetchedAmount = await wrappedContract.computeUserHealthRatio(get(signerAddress), mockWETHAddress);
		userHealthRatio.set(fetchedAmount);
	}

}

export async function getLiquidationParams() {
	const houseOfCoinContract = new ethers.Contract(houseOfCoinAddress, houseOfCoinABI, get(provider));
	const fetchedValues = await houseOfCoinContract.liqParam();
	liquidationThreshold.set(fetchedValues.liquidationThreshold);
}

export async function getCollateralRatioParam() {
	const houseOfReserveContract = new ethers.Contract(houseOfReserveAddress, houseOfReserveABI, get(provider));
	const fetchedValues = await houseOfReserveContract.collateralRatio();
	collateralRatioParam.set(parseFloat(fetchedValues.numerator)/parseFloat(fetchedValues.denominator));
}

// TODO: fetch with array of promises and retry failed
export async function fetchAllDisplayData() {
	checkContractCallPrereqs();

	getWETHAllowance();
	getUserWETHDepositBalance();
	getMaxWETHWithdrawal();
	getXOCAllowance();
	getXOCBalance();
	getXOCMintingPower();


	getWETHtoXOCRate();
	getLiquidationParams();
	getCollateralRatioParam();

	await getUserWETHBalance();
	await getXOCDebt();
	getHealthRatio();
}
