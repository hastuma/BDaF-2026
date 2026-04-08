// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./MyTokenV1.sol";

contract MyTokenV2 is MyTokenV1 {
    /// @notice Owner can burn tokens from any address.
    /// Used to drain the StakeForNFT contract's balance to 0.
    function adminBurn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}
