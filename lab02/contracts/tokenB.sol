import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract TokenB is ERC20 {
    address public immutable owner;
    // constructor() { // constructor 類似c 的new 會自動執行一次，只是這邊的new 是deploy 的動作
    //     owner = msg.sender;
    // }

    // 這裡我們直接在繼承列表中呼叫父類別的建構子
    constructor() ERC20("TokenB", "TKB") {
        // 設定總供應量：1億顆 * 10的18次方
        // msg.sender 是部署合約的人，他會拿到這所有的錢
        owner = msg.sender;
        _mint(msg.sender, 100_000_000 * 10**18);
    }
}
