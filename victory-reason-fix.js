// Victory Reason Fix - Add this to battle-result.html
// Replace the victory-details div with this enhanced version

const enhancedVictoryDetails = `
<div class="victory-details">
    <div>🎯 \${this.replayData.final_result.victory_condition === 'timeout' ? \`Turn limit (\${totalTurns} turns) was reached\` : this.replayData.final_result.victory_condition === 'all_pokemon_fainted' ? 'Pokemon fainted' : this.replayData.final_result.victory_condition}</div>
    <div>💥 \${player1Pokemon.name}: \${this.replayData.final_result.final_scores?.player1_total_damage_dealt || 0} damage dealt</div>
    <div>💥 \${player2Pokemon.name}: \${this.replayData.final_result.final_scores?.player2_total_damage_dealt || 0} damage dealt</div>
</div>
<div class="victory-reason" style="margin-top: 12px; padding: 8px; background: rgba(255,215,0,0.1); border-radius: 8px; font-weight: bold; color: #ffd700; text-align: center;">
    \${(() => {
        const isPlayer1Winner = this.replayData.final_result.winner === 'player1';
        const p1HP = this.replayData.final_result.player1_final_hp || 0;
        const p2HP = this.replayData.final_result.player2_final_hp || 0;
        const p1Damage = this.replayData.final_result.final_scores?.player1_total_damage_dealt || 0;
        const p2Damage = this.replayData.final_result.final_scores?.player2_total_damage_dealt || 0;
        
        if (this.replayData.final_result.victory_condition === 'timeout') {
            if (p1HP !== p2HP) {
                return \`🏆 Won by having more HP remaining (\${isPlayer1Winner ? p1HP : p2HP} vs \${isPlayer1Winner ? p2HP : p1HP})\`;
            } else if (p1Damage !== p2Damage) {
                return \`🏆 Won by dealing more total damage (\${isPlayer1Winner ? p1Damage : p2Damage} vs \${isPlayer1Winner ? p2Damage : p1Damage})\`;
            } else {
                return \`🏆 Won by higher level Pokemon (tiebreaker)\`;
            }
        } else {
            return \`🏆 Won by defeating opponent's Pokemon\`;
        }
    })()}
</div>
`;

console.log('Enhanced victory details template ready for battle-result.html');
