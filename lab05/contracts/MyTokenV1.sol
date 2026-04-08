// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract MyTokenV1 is Initializable, ERC20Upgradeable, OwnableUpgradeable, UUPSUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor //告訴compiler 這裡寫 constructor 不要噴警告給我
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) public initializer {
        __ERC20_init(name, symbol);
        __Ownable_init(msg.sender);
        _mint(msg.sender, initialSupply);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
