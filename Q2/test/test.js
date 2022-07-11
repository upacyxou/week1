const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { groth16, plonk } = require("snarkjs");

const wasm_tester = require("circom_tester").wasm;

const F1Field = require("ffjavascript").F1Field;
const Scalar = require("ffjavascript").Scalar;
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new F1Field(exports.p);

describe("HelloWorld", function () {
    this.timeout(100000000);
    let Verifier;
    let verifier;

    beforeEach(async function () {
        Verifier = await ethers.getContractFactory("HelloWorldVerifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });

    it("Circuit should multiply two numbers correctly", async function () {
        const circuit = await wasm_tester("contracts/circuits/HelloWorld.circom");

        const INPUT = {
            "a": 2,
            "b": 3
        }

        const witness = await circuit.calculateWitness(INPUT, true);

        //console.log(witness);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
        assert(Fr.eq(Fr.e(witness[1]),Fr.e(6)));

    });

    it("Should return true for correct proof", async function () {
        //[assignment] Add comments to explain what each line is doing
        // we're generating proof using groth16 and also getting our signals
        const { proof, publicSignals } = await groth16.fullProve({"a":"2","b":"3"}, "contracts/circuits/HelloWorld/HelloWorld_js/HelloWorld.wasm","contracts/circuits/HelloWorld/circuit_final.zkey");
        // printing exptected result
        console.log('2x3 =',publicSignals[0]);
        // getting solidity function' calldata 
        const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
        // formatting calldata so we could easily pass data to verifier in appropriate form
        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());
        console.log(argv.slice(8))
        // Creating a argument in appropriate form from calldata' BigNumbers
        const a = [argv[0], argv[1]];
        // Creating b argument in appropriate form from calldata' BigNumbers
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        // Creating c argument in appropriate form from calldata' BigNumbers
        const c = [argv[6], argv[7]];
        // Getting multiplication result
        const Input = argv.slice(8);
        // Veryfing that multiplicatiom result is right
        expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;
    });
    it("Should return false for invalid proof", async function () {
        let a = [0, 0];
        let b = [[0, 0], [0, 0]];
        let c = [0, 0];
        let d = [0]
        expect(await verifier.verifyProof(a, b, c, d)).to.be.false;
    });
});


describe("Multiplier3 with Groth16", function () {
    let VerifierFactory;
    let deployedVerifier;

    beforeEach(async function () {
        //[assignment] insert your script here
        VerifierFactory = await ethers.getContractFactory("Multiplier3Verifier");
        deployedVerifier = await VerifierFactory.deploy();
        await deployedVerifier.deployed();
    });

    it("Circuit should multiply three numbers correctly", async function () {
        //[assignment] insert your script here
        const circuit = await wasm_tester("contracts/circuits/Multiplier3.circom");
        const input = {a: 5, b:5, c:5};
        const witness = await circuit.calculateWitness(input, true);
        assert(Fr.eq(Fr.e(witness[1]),Fr.e(125)))
    });

    it("Should return true for correct proof", async function () {
        //[assignment] insert your script here
        const { proof, publicSignals } = await groth16.fullProve({a: 5, b:5, c:5}, "contracts/circuits/Multiplier3/Multiplier3_js/Multiplier3.wasm","contracts/circuits/Multiplier3/circuit_final.zkey");

        console.log('5x5x5 =',publicSignals[0]);

        const calldata = await groth16.exportSolidityCallData(proof, publicSignals);

        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());

        const a = [argv[0], argv[1]];
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        const c = [argv[6], argv[7]];
        const Input = argv.slice(8);

        expect(await deployedVerifier.verifyProof(a, b, c, Input)).to.be.true;
    });

    it("Should return false for invalid proof", async function () {
        //[assignment] insert your script here
        const a = [0, 0];
        const b = [[0, 0], [0, 0]];
        const c = [0, 0];
        const d = [0]
        expect(await deployedVerifier.verifyProof(a, b, c, d)).to.be.false;
    });
});


describe("Multiplier3 with PLONK", function () {
    let VerifierFactory;
    let deployedVerifier;

    beforeEach(async function () {
        //[assignment] insert your script here
        VerifierFactory = await ethers.getContractFactory("Multiplier3Verifier_plonk");
        deployedVerifier = await VerifierFactory.deploy();
        await deployedVerifier.deployed();
    });

    it("Should return true for correct proof", async function () {
        //[assignment] insert your script here
        const { proof, publicSignals } = await plonk.fullProve({a:5, b:5, c:5}, "contracts/circuits/Multiplier3_plonk/Multiplier3_js/Multiplier3.wasm","contracts/circuits/Multiplier3_plonk/circuit_final.zkey");

        console.log('5x5x5 =',publicSignals[0]);

        const calldata = await plonk.exportSolidityCallData(proof, publicSignals);

        const argv = calldata.replace(/["[\]\s]/g, "").split(',');

        const plonkProof = argv[0];
        const signals = argv.slice(1);

        expect(await deployedVerifier.verifyProof(plonkProof, signals)).to.be.true;
    });
    
    it("Should return false for invalid proof", async function () {
        //[assignment] insert your script here
        const falseProof = 0x0;
        const signals = [0]
        expect(await deployedVerifier.verifyProof(falseProof, signals)).to.be.false;
    });
});