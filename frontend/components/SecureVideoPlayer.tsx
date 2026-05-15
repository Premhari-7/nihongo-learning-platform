import React, { useRef, useState, useEffect, useContext } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { FontAwesome } from '@expo/vector-icons';
import { Theme } from '../constants/Theme';
import { AuthContext, API_URL } from '../context/AuthContext';
import { CourseContext } from '../context/CourseContext';
import axios from 'axios';

interface SecureVideoPlayerProps {
    videoUri: string;
    videoId: string;
    onComplete: () => void;
}

export default function SecureVideoPlayer({ videoUri, videoId, onComplete }: SecureVideoPlayerProps) {
    const videoRef = useRef<Video>(null);
    const htmlVideoRef = useRef<HTMLVideoElement>(null);
    const { user } = useContext(AuthContext);
    const { selectedCourse } = useContext(CourseContext);
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [currentPositionMillis, setCurrentPositionMillis] = useState(0);
    const [durationMillis, setDurationMillis] = useState(0);
    const [isCompleted, setIsCompleted] = useState(false);
    const [isLoading, setIsLoading] = useState(Platform.OS !== 'web');
    const [loadError, setLoadError] = useState<string | null>(null);

    const [accumulatedWatchTime, setAccumulatedWatchTime] = useState(0);
    const lastUpdateMillisRef = useRef(0);
    
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<any>(null);

    const [progressBarWidth, setProgressBarWidth] = useState(0);
    const highestWatchedMillisRef = useRef(0);

    useEffect(() => {
        const interval = setInterval(() => {
            if (accumulatedWatchTime > 0 && selectedCourse && user) {
                saveProgress();
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [accumulatedWatchTime, selectedCourse, user]);

    useEffect(() => {
        if (Platform.OS !== 'web') {
            resetControlsTimeout();
        }
        return () => {
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, []);

    const resetControlsTimeout = () => {
        if (Platform.OS === 'web') return;
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) {
                setShowControls(false);
            }
        }, 3000);
    };

    const saveProgress = async (forceComplete = false) => {
        try {
            const userId = user?.id || user?._id;
            await axios.post(`${API_URL}/progress/update`, {
                userId: userId,
                courseId: selectedCourse?.id,
                videoId: videoId,
                highestWatched: accumulatedWatchTime,
                isCompleted: forceComplete || isCompleted
            });
        } catch (err) {
            console.error('Failed to save progress', err);
        }
    };

    const handleWebTimeUpdate = (e: any) => {
        const video = e.target;
        const positionMillis = video.currentTime * 1000;
        const durationM = video.duration * 1000 || 0;
        
        setCurrentPositionMillis(positionMillis);
        setDurationMillis(durationM);
        
        const now = Date.now();
        if (positionMillis > highestWatchedMillisRef.current) {
            if (positionMillis <= highestWatchedMillisRef.current + 2500 * playbackRate) {
                highestWatchedMillisRef.current = positionMillis;
            } else {
                video.currentTime = highestWatchedMillisRef.current / 1000;
            }
        }
        
        if (lastUpdateMillisRef.current > 0 && isPlaying) {
            const delta = now - lastUpdateMillisRef.current;
            if (delta < 2000) {
                setAccumulatedWatchTime(prev => prev + (delta * playbackRate));
            }
        }
        lastUpdateMillisRef.current = now;
        
        if (durationM && !isCompleted) {
            const percentageWatched = accumulatedWatchTime / durationM;
            if (percentageWatched > 0.95 || (video.ended && percentageWatched > 0.90)) {
                setIsCompleted(true);
                saveProgress(true).then(() => {
                    onComplete();
                });
            }
        }
    };

    const handleWebPlay = () => {
        setIsPlaying(true);
        lastUpdateMillisRef.current = Date.now();
    };

    const handleWebPause = () => {
        setIsPlaying(false);
        lastUpdateMillisRef.current = 0;
    };

    const handleWebLoadedMetadata = (e: any) => {
        setLoadError(null);
        setDurationMillis(e.target.duration * 1000);
    };

    const handleWebError = (e: any) => {
        console.error("Web Video Error", e.nativeEvent);
        setLoadError('Video failed to load. Please check your connection and try again.');
    };

    const handleWebEnded = () => {
        const durationM = durationMillis || (htmlVideoRef.current?.duration || 0) * 1000;
        if (durationM && !isCompleted) {
            const percentageWatched = accumulatedWatchTime / durationM;
            if (percentageWatched > 0.90) {
                setIsCompleted(true);
                saveProgress(true).then(() => onComplete());
            }
        }
    };

    const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
        if (!status.isLoaded) {
            if (status.error) {
                console.error("Video Error:", status.error, "URL:", videoUri);
                setLoadError('Video failed to load. Please check your connection and try again.');
                setIsLoading(false);
            }
            return;
        }
        if (loadError) setLoadError(null);

        setIsLoading(status.isBuffering);
        setIsPlaying(status.isPlaying);
        setDurationMillis(status.durationMillis || 0);
        setCurrentPositionMillis(status.positionMillis);

        if (status.isPlaying) {
            const now = Date.now();
            if (status.positionMillis > highestWatchedMillisRef.current) {
                if (status.positionMillis <= highestWatchedMillisRef.current + 2500 * playbackRate) {
                    highestWatchedMillisRef.current = status.positionMillis;
                } else {
                    videoRef.current?.setPositionAsync(highestWatchedMillisRef.current);
                }
            }

            if (lastUpdateMillisRef.current > 0) {
                const delta = now - lastUpdateMillisRef.current;
                if (delta < 2000) {
                    setAccumulatedWatchTime(prev => prev + (delta * playbackRate));
                }
            }
            lastUpdateMillisRef.current = now;
        } else {
            lastUpdateMillisRef.current = 0;
        }

        if (status.durationMillis && !isCompleted) {
            const percentageWatched = accumulatedWatchTime / status.durationMillis;
            if (percentageWatched > 0.95 || (status.didJustFinish && percentageWatched > 0.90)) {
                setIsCompleted(true);
                saveProgress(true).then(() => {
                    onComplete();
                });
            }
        }
    };

    const togglePlayPause = () => {
        if (isPlaying) {
            videoRef.current?.pauseAsync();
        } else {
            videoRef.current?.playAsync();
            resetControlsTimeout();
        }
    };

    const lastTapLeftRef = useRef(0);
    const handleTapLeft = async () => {
        const now = Date.now();
        if (now - lastTapLeftRef.current < 300) {
            if (!videoRef.current) return;
            const status = await videoRef.current.getStatusAsync();
            if (status.isLoaded) {
                const newPosition = Math.max(0, status.positionMillis - 10000);
                await videoRef.current.setPositionAsync(newPosition);
            }
        } else {
            resetControlsTimeout();
        }
        lastTapLeftRef.current = now;
    };

    const lastTapRightRef = useRef(0);
    const handleTapRight = async () => {
        const now = Date.now();
        if (now - lastTapRightRef.current < 300) {
            if (!videoRef.current) return;
            const status = await videoRef.current.getStatusAsync();
            if (status.isLoaded && status.durationMillis) {
                const newPosition = Math.min(status.durationMillis, status.positionMillis + 10000);
                if (newPosition <= highestWatchedMillisRef.current) {
                    await videoRef.current.setPositionAsync(newPosition);
                } else {
                    await videoRef.current.setPositionAsync(highestWatchedMillisRef.current);
                }
            }
        } else {
            resetControlsTimeout();
        }
        lastTapRightRef.current = now;
    };

    const handleProgressBarPress = (evt: any) => {
        resetControlsTimeout();
        if (!durationMillis || !progressBarWidth || !videoRef.current) return;
        
        const clickX = evt.nativeEvent.locationX !== undefined ? evt.nativeEvent.locationX : evt.nativeEvent.offsetX;
        if (clickX === undefined) return;
        
        const percentage = clickX / progressBarWidth;
        const newPosition = percentage * durationMillis;

        if (newPosition <= highestWatchedMillisRef.current) {
            videoRef.current.setPositionAsync(newPosition);
        } else {
            videoRef.current.setPositionAsync(highestWatchedMillisRef.current);
        }
    };

    const toggleSpeed = () => {
        resetControlsTimeout();
        const newRate = playbackRate === 1.0 ? 1.5 : playbackRate === 1.5 ? 2.0 : 1.0;
        setPlaybackRate(newRate);
        videoRef.current?.setRateAsync(newRate, true);
    };

    const toggleFullscreen = () => {
        resetControlsTimeout();
        videoRef.current?.presentFullscreenPlayer();
    };

    const formatTime = (millis: number) => {
        const totalSeconds = Math.floor(millis / 1000);
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleRetry = () => {
        setLoadError(null);
        setIsLoading(true);
        if (Platform.OS === 'web') {
            if (htmlVideoRef.current) {
                htmlVideoRef.current.load();
            }
        } else {
            videoRef.current?.unloadAsync().then(() => {
                videoRef.current?.loadAsync({ uri: videoUri }, {}, false);
            });
        }
    };

    if (loadError) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}> 
                <FontAwesome name="exclamation-triangle" size={40} color="#E63946" style={{ marginBottom: 12 }} />
                <Text style={{ color: '#fff', fontSize: 15, textAlign: 'center', marginBottom: 16, paddingHorizontal: 20 }}>
                    {loadError}
                </Text>
                <TouchableOpacity
                    onPress={handleRetry}
                    style={{ backgroundColor: Theme.colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 }}
                >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (Platform.OS === 'web') {
        return (
            <View style={styles.container}>
                {/* @ts-ignore */}
                <video
                    ref={htmlVideoRef as any}
                    src={videoUri}
                    controls
                    preload="metadata"
                    crossOrigin="anonymous"
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onTimeUpdate={handleWebTimeUpdate}
                    onPlay={handleWebPlay}
                    onPause={handleWebPause}
                    onLoadedMetadata={handleWebLoadedMetadata}
                    onError={handleWebError}
                    onEnded={handleWebEnded}
                >
                    <source src={videoUri} type="video/mp4" />
                </video>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Video
                ref={videoRef}
                style={styles.video}
                source={{ uri: videoUri }}
                useNativeControls={false} 
                resizeMode={ResizeMode.CONTAIN}
                onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            />
            
            <View style={styles.gestureOverlay}>
                <TouchableOpacity style={styles.gestureZone} onPress={handleTapLeft} activeOpacity={1} />
                <TouchableOpacity style={styles.gestureZone} onPress={handleTapRight} activeOpacity={1} />
            </View>

            {showControls && (
                <View style={styles.controlsOverlay} pointerEvents="box-none">
                    <View style={styles.centerControls} pointerEvents="box-none">
                        {isLoading ? (
                            <ActivityIndicator size="large" color={Theme.colors.primary} />
                        ) : (
                            <TouchableOpacity style={styles.bigPlayBtn} onPress={togglePlayPause}>
                                <FontAwesome name={isPlaying ? "pause" : "play"} size={30} color="#fff" style={{ marginLeft: isPlaying ? 0 : 5 }} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.bottomBar}>
                        <TouchableOpacity 
                            activeOpacity={1} 
                            style={styles.progressBarBg} 
                            onLayout={(e) => setProgressBarWidth(e.nativeEvent.layout.width)}
                            onPress={handleProgressBarPress}
                        >
                            <View style={[styles.progressBarFill, { width: durationMillis > 0 ? `${(currentPositionMillis / durationMillis) * 100}%` : '0%' }]} />
                        </TouchableOpacity>
                        
                        <View style={styles.controlsRow}>
                            <View style={styles.leftControls}>
                                <TouchableOpacity style={styles.controlBtn} onPress={togglePlayPause}>
                                    <FontAwesome name={isPlaying ? "pause" : "play"} size={18} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.timeText}>
                                    {formatTime(currentPositionMillis)} / {formatTime(durationMillis)}
                                </Text>
                            </View>
                            
                            <View style={styles.rightControls}>
                                <TouchableOpacity style={styles.controlBtn} onPress={toggleSpeed}>
                                    <Text style={styles.speedText}>{playbackRate}x</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.controlBtn} onPress={toggleFullscreen}>
                                    <FontAwesome name="expand" size={18} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: '#000',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: Theme.colors.primary,
        shadowColor: Theme.colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 15,
        position: 'relative',
        marginBottom: 20,
    },
    video: {
        width: '100%',
        height: '100%',
    },
    gestureOverlay: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: 'row',
        zIndex: 1,
    },
    gestureZone: {
        flex: 1,
        height: '100%',
    },
    controlsOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        zIndex: 2,
    },
    centerControls: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bigPlayBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(155, 28, 28, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.8)',
    },
    bottomBar: {
        width: '100%',
        padding: 15,
        paddingTop: 30,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    progressBarBg: {
        height: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 15,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Theme.colors.primary,
        borderRadius: 6,
    },
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    leftControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rightControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    controlBtn: {
        paddingHorizontal: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeText: {
        color: '#fff',
        fontSize: 12,
        marginLeft: 10,
        fontVariant: ['tabular-nums'],
    },
    speedText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    }
});
