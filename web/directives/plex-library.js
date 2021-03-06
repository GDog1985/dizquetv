module.exports = function (plex, dizquetv, $timeout) {
    return {
        restrict: 'E',
        templateUrl: 'templates/plex-library.html',
        replace: true,
        scope: {
            onFinish: "=onFinish",
            height: "=height",
            visible: "=visible",
            limit: "@limit",
        },
        link: function (scope, element, attrs) {
            if ( typeof(scope.limit) == 'undefined') {
                scope.limit = 1000000000;
            }
            scope.selection = []
            scope.selectServer = function (server) {
                scope.plexServer = server
                updateLibrary(server)
            }
            scope._onFinish = (s) => {
                if (s.length > scope.limit) {
                    if (scope.limit == 1) {
                        scope.error = "Please select only one clip.";
                    } else {
                        scope.error = `Please select at most ${scope.limit} clips.`;
                    }
                } else {
                    scope.onFinish(s)
                    scope.selection = []
                    scope.visible = false
                }
            }
            scope.selectItem = (item) => {
                return new Promise((resolve, reject) => {
                    $timeout(async () => {
                        item.streams = await plex.getStreams(scope.plexServer, item.key)
                        scope.selection.push(JSON.parse(angular.toJson(item)))
                        scope.$apply()
                        resolve()
                    }, 0)
                })
            }
            dizquetv.getPlexServers().then((servers) => {
                if (servers.length === 0) {
                    scope.noServers = true
                    return
                }
                scope.plexServers = servers
                scope.plexServer = servers[0]
                updateLibrary(scope.plexServer)
            })

            function updateLibrary(server) {
                plex.getLibrary(server).then((lib) => {
                    plex.getPlaylists(server).then((play) => {
                        for (let i = 0, l = play.length; i < l; i++)
                            play[i].type = 'playlist'
                        scope.$apply(() => {
                            scope.libraries = lib
                            if (play.length > 0)
                                scope.libraries.push({ title: "Playlists", key: "", icon: "", nested: play })
                        })
                    })
                }, (err) => {
                    console.log(err)
                })
            }
            scope.getNested = (list) => {
                $timeout(async () => {
                    if (typeof list.nested === 'undefined')
                        list.nested = await plex.getNested(scope.plexServer, list.key)
                    list.collapse = !list.collapse
                    scope.$apply()
                }, 0)
            }
            
            scope.selectSeason = (season) => {
                return new Promise((resolve, reject) => {
                    $timeout(async () => {
                        if (typeof season.nested === 'undefined')
                            season.nested = await plex.getNested(scope.plexServer, season.key)
                        for (let i = 0, l = season.nested.length; i < l; i++)
                            await scope.selectItem(season.nested[i])
                        scope.$apply()
                        resolve()
                    }, 0)
                })
            }
            scope.selectShow = (show) => {
                return new Promise((resolve, reject) => {
                    $timeout(async () => {
                        if (typeof show.nested === 'undefined')
                            show.nested = await plex.getNested(scope.plexServer, show.key)
                        for (let i = 0, l = show.nested.length; i < l; i++) 
                            await scope.selectSeason(show.nested[i])
                        scope.$apply()
                        resolve()
                    }, 0)
                })
            }
            scope.selectPlaylist = async (playlist) => {
                return new Promise((resolve, reject) => {
                    $timeout(async () => {
                        if (typeof playlist.nested === 'undefined')
                            playlist.nested = await plex.getNested(scope.plexServer, playlist.key)
                        for (let i = 0, l = playlist.nested.length; i < l; i++)
                            await scope.selectItem(playlist.nested[i])
                        scope.$apply()
                        resolve()
                    }, 0)
                })
            }
            scope.createShowIdentifier = (season, ep) => {
                return 'S' + (season.toString().padStart(2, '0')) + 'E' + (ep.toString().padStart(2, '0'))
            }
        }
    };
}