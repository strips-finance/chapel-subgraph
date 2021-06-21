import { Address, log, BigInt } from '@graphprotocol/graph-ts';
import { ERC20Contract } from '../generated/ERC20Contract';
import { ERC20SymbolBytesContract } from '../generated/ERC20SymbolBytesContract';

export function getERC20Supply(address: Address): BigInt {
  let contract = ERC20Contract.bind(address);

  let supplyCall = contract.try_totalSupply();

  // standard ERC20 implementation
  if (!supplyCall.reverted) {
    return supplyCall.value;
  }

  // warning if both calls fail
  log.warning('totalSupply() reverted for {}', [address.toHex()]);
  return BigInt.fromI32(0);
}