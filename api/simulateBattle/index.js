const axios = require('axios');

// Helper: Get number of turns from Dataverse portal settings
async function getNumberOfTurns(dataverseBaseUrl) {
  try {
    const response = await axios.get(`${dataverseBaseUrl}/pokemon_portalsettings?$filter=pokemon_settingname eq 'battle_turns'`);
    const value = response.data.value?.[0]?.pokemon_settingvalue;
    const turns = parseInt(value, 10);
    return isNaN(turns) ? 3 : turns;
  } catch {
    return 3; // fallback
  }
}

// Helper: Fetch random move for a Pokémon from PokeAPI
async function getRandomMove(pokemonNameOrId) {
  const pokeApiUrl = `https://pokeapi.co/api/v2/pokemon/${pokemonNameOrId}`;
  const pokeResp = await axios.get(pokeApiUrl);
  const moves = pokeResp.data.moves;
  if (!moves || moves.length === 0) return null;
  const move = moves[Math.floor(Math.random() * moves.length)].move;
  // Fetch move details for power, type, etc.
  const moveDetails = await axios.get(move.url);
  return {
    name: move.name,
    power: moveDetails.data.power || 40, // fallback if null
    type: moveDetails.data.type.name,
  };
}

// Helper: Calculate damage
function calculateDamage(attacker, defender, move) {
  // Simple formula: (level * attack / defence) * movePower / 10 + random
  const base = (attacker.pokemon_level || 1) * (attacker.pokemon_attack || 10) / ((defender.pokemon_defence || 10) || 1);
  const movePower = move.power || 40;
  const random = Math.floor(Math.random() * 5) + 1;
  let damage = Math.floor((base * movePower) / 10 + random);
  // Clamp to at least 1
  return Math.max(1, damage);
}

module.exports = async function (context, req) {
  const dataverseBaseUrl = process.env.DATAVERSE_API_BASE || "http://localhost:7071/api/dataverse";
  const { pokemon1, pokemon2 } = req.body || {};
  if (!pokemon1 || !pokemon2) {
    context.res = { status: 400, body: { error: "Missing pokemon1 or pokemon2 in request body." } };
    return;
  }

  // Get number of turns from Dataverse portal settings
  const numberOfTurns = await getNumberOfTurns(dataverseBaseUrl);

  // Clone HP for simulation
  let p1 = { ...pokemon1, hp: pokemon1.pokemon_hp };
  let p2 = { ...pokemon2, hp: pokemon2.pokemon_hp };
  const steps = [];

  for (let turn = 1; turn <= numberOfTurns; turn++) {
    // Pokémon 1 attacks
    const move1 = await getRandomMove(p1.pokemon_id || p1.pokemonId || p1.name);
    const dmg1 = calculateDamage(p1, p2, move1);
    p2.hp = Math.max(0, p2.hp - dmg1);
    steps.push({
      turn,
      actor: p1.name,
      move: move1?.name || "Tackle",
      target: p2.name,
      damage: dmg1,
      hpAfter: p2.hp,
    });
    if (p2.hp <= 0) break;

    // Pokémon 2 attacks
    const move2 = await getRandomMove(p2.pokemon_id || p2.pokemonId || p2.name);
    const dmg2 = calculateDamage(p2, p1, move2);
    p1.hp = Math.max(0, p1.hp - dmg2);
    steps.push({
      turn,
      actor: p2.name,
      move: move2?.name || "Tackle",
      target: p1.name,
      damage: dmg2,
      hpAfter: p1.hp,
    });
    if (p1.hp <= 0) break;
  }

  // Determine winner
  let winner = null;
  if (p1.hp > p2.hp) winner = p1.name;
  else if (p2.hp > p1.hp) winner = p2.name;
  else winner = "Draw";
  steps.push({ result: winner === "Draw" ? "It's a draw!" : `${winner} wins the battle!` });

  context.res = {
    status: 200,
    body: { steps, winner, p1hp: p1.hp, p2hp: p2.hp }
  };
};
