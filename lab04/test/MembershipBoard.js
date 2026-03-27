const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const { StandardMerkleTree } = require("@openzeppelin/merkle-tree");

describe("MembershipBoard", function () {
  let board;
  let owner;
  let other;
  let membersArray;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    const MembershipBoard = await ethers.getContractFactory("MembershipBoard");
    board = await await MembershipBoard.deploy();
    const jsonData = JSON.parse(fs.readFileSync("./members.json", "utf8"));
    membersArray = jsonData.addresses;
  });

  describe("Part 1: addMember", function () {
    it("only owner can add a member", async function () {
      const candidate = membersArray[0];

      await expect(board.connect(other).addMember(candidate))
        .to.be.revertedWithCustomError(board, "OwnableUnauthorizedAccount")
        .withArgs(other.address);

      await expect(board.addMember(candidate))
        .to.emit(board, "MemberAdded")
        .withArgs(candidate);

      expect(await board.members(candidate)).to.equal(true);
    });

    it("reverts when adding duplicate member", async function () {
      const candidate = membersArray[1];
      await board.addMember(candidate);
      await expect(board.addMember(candidate)).to.be.revertedWith("Member already exists");
    });
  });

  describe("Part 2: batchAddMembers", function () {
    it("reverts if any member in batch already exists", async function () {
      const existing = membersArray[2];
      await board.addMember(existing);

      const batch = [membersArray[3], existing, membersArray[4]];
      await expect(board.batchAddMembers(batch)).to.be.revertedWith("Member already exists");
    });

    it("batch add all 1,000 members (split into 4 batches)", async function () {
      const allMembers = membersArray.slice(0, 1000);
      const batchSize = 250;

      for (let i = 0; i < allMembers.length; i += batchSize) {
        const batch = allMembers.slice(i, i + batchSize);
        await board.batchAddMembers(batch);
      }

      expect(await board.members(allMembers[0])).to.equal(true);
      expect(await board.members(allMembers[999])).to.equal(true);
    });
    
  });


  describe("Part 3, 4, 5: Merkle Tree & Verification", function () {
    let tree;

    beforeEach(async function () {
      const values = membersArray.map(addr => [addr]);
      tree = StandardMerkleTree.of(values, ["address"]);
    });

    it("Part 3: Set Merkle Root", async function () {
      await expect(board.setMerkleRoot(tree.root))
        .to.emit(board, "MerkleRootSet")
        .withArgs(tree.root);
      
      expect(await board.merkleRoot()).to.equal(tree.root);
    });
    it("Non-owner cannot set the Merkle root", async function () {

    await expect(board.connect(other).setMerkleRoot(tree.root))
      .to.be.revertedWithCustomError(board, "OwnableUnauthorizedAccount")
      .withArgs(other.address);
    });
  it("Part  4: Verify Member By Mapping", async function () {
        const candidate = membersArray[10]; 
        await board.addMember(candidate);
        
        expect(await board.verifyMemberByMapping(candidate)).to.equal(true);
        const nonMember = other.address;
        expect(await board.verifyMemberByMapping(nonMember)).to.equal(false);
        const gas1 = await board.verifyMemberByMapping.estimateGas(candidate);
        console.log(`\n    ➡️ Mapping 驗證 Gas: ${gas1.toString()}`);
      });

    it("Part 5: Verify Member By Proof", async function () {
      await board.setMerkleRoot(tree.root);
      const targetIndex = 50; 
      const memberAddress = membersArray[targetIndex]; 
      const proof = tree.getProof(targetIndex);
      
      const isValid = await board.verifyMemberByProof(memberAddress, proof);
      expect(isValid).to.equal(true);
      const fakeProof = tree.getProof(0); 
      const isFakeValid = await board.verifyMemberByProof(memberAddress, fakeProof);
      expect(isFakeValid).to.equal(false);
      
      const nonMember = other.address;
      const anyProof = tree.getProof(0);
      const isNonMemberValid = await board.verifyMemberByProof(nonMember, anyProof);
      expect(isNonMemberValid).to.equal(false);
      const gas2 = await board.verifyMemberByProof.estimateGas(memberAddress, proof);
      console.log(`    ➡️ Merkle Proof 驗證 Gas: ${gas2.toString()}\n`);
    });
  });
});