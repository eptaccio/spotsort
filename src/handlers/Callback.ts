import { SpotfyCallback } from '../types'
import { Request, Response } from 'express'
import { buildSpotfyUserSession } from './helpers/spotifyBuilder'

const sortByBPM = (musics: SpotifyApi.AudioFeaturesObject[]) =>
  musics.sort((a, b) => (a.tempo > b.tempo) ? 1 : -1)

export const Callback = async (req: Request, res: Response) => {  
  const { error, code, state: playlistId } = req.query as SpotfyCallback

  if (error) {
    res.send(`Callback Error: ${error}`)
    return
  }
  
  try {
    const spotify = await buildSpotfyUserSession(code)

    const { body: currentPlayList } = await spotify.getPlaylist(playlistId)
    const trackIds = currentPlayList.tracks.items.map(track => track.track?.id ?? '')
    const { body: { audio_features: musics } } = await spotify.getAudioFeaturesForTracks(trackIds)
    
    const { body: newPlaylist } = await spotify.createPlaylist(`${currentPlayList.name} (organized by bpm)`, {
      collaborative: currentPlayList.collaborative,
      description: `this playlists is generated by a script`,
      public: currentPlayList.public || false
    })
    
    const sortedByBPM = sortByBPM(musics)
    const newPlaylistSongs = sortedByBPM.map(track => track.uri)
    await spotify.addTracksToPlaylist(newPlaylist.id, newPlaylistSongs)

    res.redirect(`/success?url=${newPlaylist.external_urls.spotify}`)
  } catch (error) {
    res.send(error)
  }
}