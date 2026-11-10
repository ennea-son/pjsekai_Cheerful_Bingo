export function filterSongs(allSongs, searchText, selectedUnit, selectedMvType, selectedSongType) {
  return allSongs.filter((song) => {
    const matchesText = song.title.toLowerCase().includes(searchText.toLowerCase());
    const matchesUnit = selectedUnit === "" || song.unit === selectedUnit;
    const matchesMv = !selectedMvType || (song.mvTypes && song.mvTypes.includes(selectedMvType));
    const matchesSongType = !selectedSongType || song.songType === selectedSongType;
    return matchesText && matchesUnit && matchesMv && matchesSongType;
  });
}
