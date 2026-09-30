/**
 * Actor preparation regression, without a Foundry server or world data.
 * Usage: node tools/test-actor-preparation.mjs
 * The parent lifecycle is a test double; this checks delegation, not rendering.
 */
import assert from "node:assert/strict";

globalThis.Actor = class {
    prepareData() {
        assert.equal(typeof this.dadosColoridos.dadosColoridos, "function");
        this.preparations = (this.preparations ?? 0) + 1;
        this.tokenActiveEffectChanges = {initial: [], final: []};
        for (const effect of this.effects ?? []) {
            if (!effect.active) continue;
            for (const change of effect.system.changes) {
                if (!change.key.startsWith("token.")) continue;
                this.tokenActiveEffectChanges[change.phase].push({
                    ...change, key: change.key.slice(6)
                });
            }
        }
    }
};

const {tagmarActor} = await import("../modules/tagmarActor.js");
for (const type of ["Personagem", "NPC", "Inventario"]) {
    const actor = new tagmarActor();
    actor.type = type;
    const effect = {active: true, system: {changes: [
        {key: "token.light.dim", value: 12, phase: "initial"},
        {key: "token.light.bright", value: 6, phase: "initial"}
    ]}};
    actor.effects = [effect];
    assert.equal(actor.prepareData(), undefined, "Preparation must not return a Promise");
    assert.equal(actor.preparations, 1);
    assert.deepEqual(actor.tokenActiveEffectChanges.initial.map(c => c.value), [12, 6]);
    const roll = {dice: [{options: {}}]};
    actor.dadosColoridos.dadosColoridos("azul", roll);
    assert.equal(roll.dice[0].options.appearance.foreground, "#00a1e8");

    effect.active = false;
    actor.prepareData();
    assert.deepEqual(actor.tokenActiveEffectChanges.initial, []);
    effect.active = true;
    actor.prepareData();
    actor.prepareData();
    assert.equal(actor.tokenActiveEffectChanges.initial.length, 2);
    actor.effects = [];
    actor.prepareData();
    assert.deepEqual(actor.tokenActiveEffectChanges.initial, []);
    assert.equal(actor.preparations, 5);
    console.log(`PASS ${type}: synchronous lifecycle, dice, enable/disable/remove effects`);
}
