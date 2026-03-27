// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
contract MembershipBoard is Ownable {
    mapping(address => bool) public members;
    event MemberAdded(address indexed member);
    constructor() Ownable(msg.sender) {
    }
    function addMember(address _member) external onlyOwner {
        require(!members[_member], "Member already exists");
        members[_member] = true;
        emit MemberAdded(_member);
    }

    function batchAddMembers(address[] calldata _members) external onlyOwner {
        uint256 len = _members.length;
        for (uint256 i = 0; i < len; i++) {
            address member = _members[i];
            require(!members[member], "Member already exists");

            members[member] = true;
            emit MemberAdded(member);
        }
    }

    
    bytes32 public merkleRoot;
    event MerkleRootSet(bytes32 indexed root);


    function setMerkleRoot(bytes32 _root) external onlyOwner {
        merkleRoot = _root;
        emit MerkleRootSet(_root);
    }


    function verifyMemberByMapping(address _member) external view returns (bool) {
        return members[_member];
    }

    function verifyMemberByProof(address _member, bytes32[] calldata _proof) external view returns (bool) {
        
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(_member))));
        return MerkleProof.verify(_proof, merkleRoot, leaf);
    }
}