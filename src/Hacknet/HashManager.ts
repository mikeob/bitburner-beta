/**
 * This is a central class for storing and managing the player's hashes,
 * which are generated by Hacknet Servers
 *
 * It is also used to keep track of what upgrades the player has bought with
 * his hashes, and contains method for grabbing the data/multipliers from
 * those upgrades
 */
import { HacknetServer } from "./HacknetServer";
import { HashUpgrades } from "./HashUpgrades";

import { IMap } from "../types";
import { IPlayer } from "../PersonObjects/IPlayer";
import { AllServers } from "../Server/AllServers";
import { Generic_fromJSON,
         Generic_toJSON,
         Reviver } from "../../utils/JSONReviver";

export class HashManager {
    // Initiatizes a HashManager object from a JSON save state.
    static fromJSON(value: any): HashManager {
        return Generic_fromJSON(HashManager, value.data);
    }

    // Max number of hashes this can hold. Equal to the sum of capacities of
    // all Hacknet Servers
    capacity: number = 0;

    // Number of hashes currently in storage
    hashes: number = 0;

    // Map of Hash Upgrade Name -> levels in that upgrade
    upgrades: IMap<number> = {};

    constructor() {
        for (const name in HashUpgrades) {
            this.upgrades[name] = 0;
        }
    }

    /**
     * Generic helper function for getting a multiplier from a HashUpgrade
     */
    getMult(upgName: string): number {
        const upg = HashUpgrades[upgName];
        const currLevel = this.upgrades[upgName];
        if (upg == null || currLevel == null) {
            console.error(`Could not find Hash Study upgrade`);
            return 1;
        }

        return 1 + ((upg.value * currLevel) / 100);
    }

    /**
     * One of the Hash upgrades improves studying. This returns that multiplier
     */
    getStudyMult(): number {
        const upgName = "Improve Studying";

        return this.getMult(upgName);
    }

    /**
     * One of the Hash upgrades improves gym training. This returns that multiplier
     */
    getTrainingMult(): number {
        const upgName = "Improve Gym Training";

        return this.getMult(upgName);
    }

    /**
     * Get the cost (in hashes) of an upgrade
     */
    getUpgradeCost(upgName: string): number {
        const upg = HashUpgrades[upgName];
        const currLevel = this.upgrades[upgName];
        if (upg == null || currLevel == null) {
            console.error(`Invalid Upgrade Name given to HashManager.getUpgradeCost(): ${upgName}`);
            return Infinity;
        }

        return upg.getCost(currLevel);
    }

    prestige(p: IPlayer): void {
        for (const name in HashUpgrades) {
            this.upgrades[name] = 0;
        }
        this.hashes = 0;
        if (p != null) {
            this.updateCapacity(p);
        }
    }

    /**
     * Reverts an upgrade and refunds the hashes used to buy it
     */
    refundUpgrade(upgName: string): void {
        const upg = HashUpgrades[upgName];
        const currLevel = this.upgrades[upgName];
        if (upg == null || currLevel == null || currLevel === 0) {
            console.error(`Invalid Upgrade Name given to HashManager.upgrade(): ${upgName}`);
            return;
        }

        // Reduce the level first, so we get the right cost
        --this.upgrades[upgName];
        const cost = upg.getCost(currLevel);
        this.hashes += cost;
    }

    storeHashes(numHashes: number): void {
        this.hashes += numHashes;
        this.hashes = Math.min(this.hashes, this.capacity);
    }

    updateCapacity(p: IPlayer): void {
        if (p.hacknetNodes.length <= 0) {
            this.capacity = 0;
            return;
        }

        // Make sure the Player's `hacknetNodes` property actually holds Hacknet Servers
        const ip: string = <string>p.hacknetNodes[0];
        if (typeof ip !== "string") {
            this.capacity = 0;
            return;
        }

        const hserver = <HacknetServer>AllServers[ip];
        if (!(hserver instanceof HacknetServer)) {
            this.capacity = 0;
            return;
        }


        let total: number = 0;
        for (let i = 0; i < p.hacknetNodes.length; ++i) {
            const h = <HacknetServer>AllServers[<string>p.hacknetNodes[i]];
            total += h.hashCapacity;
        }

        this.capacity = total;
    }

    /**
     * Returns boolean indicating whether or not the upgrade was successfully purchased
     * Note that this does NOT actually implement the effect
     */
    upgrade(upgName: string): boolean {
        const upg = HashUpgrades[upgName];
        const currLevel = this.upgrades[upgName];
        if (upg == null || currLevel == null) {
            console.error(`Invalid Upgrade Name given to HashManager.upgrade(): ${upgName}`);
            return false;
        }

        const cost = upg.getCost(currLevel);

        if (this.hashes < cost) {
            return false;
        }

        this.hashes -= cost;
        ++this.upgrades[upgName];

        return true;
    }

    //Serialize the current object to a JSON save state.
    toJSON(): any {
        return Generic_toJSON("HashManager", this);
    }
}

Reviver.constructors.HashManager = HashManager;
