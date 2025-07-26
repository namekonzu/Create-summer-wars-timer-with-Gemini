document.addEventListener('DOMContentLoaded', function () {
    const hoursSpan = document.getElementById('hours');
    const minutesSpan = document.getElementById('minutes');
    const secondsSpan = document.getElementById('seconds');
    const randomGifElement = document.getElementById('randomGif');

    const gifPaths = [
        'gifs/gif1.gif',
        'gifs/gif2.gif',
        'gifs/gif3.gif',
        'gifs/gif4.gif',
        'gifs/gif5.gif',
    ];

    // --- 音源関連の変数 ---
    const tickSoundFilePath = 'sounds/sound1.wav'; // 毎秒鳴る音のパス
    const finishSoundFilePath = 'sounds/sound2.wav'; // ★ 0時に鳴る音のパス

    let tickSound = new Audio(tickSoundFilePath);
    tickSound.volume = 0.5;

    let finishSound = new Audio(finishSoundFilePath); // ★ 0時用のAudioオブジェクト
    finishSound.volume = 0.7; // 0時の音は少し大きめに設定することも可能

    // Web Audio APIのコンテキスト作成
    let audioContext;
    let tickAudioBuffer; // 毎秒音用
    let finishAudioBuffer; // ★ 0時音用

    let finishSoundPlayed = false; // ★ 0時の音が重複して鳴らないようにするためのフラグ

    // ユーザーインタラクションがあったときにAudioContextを有効にする
    document.body.addEventListener('click', function setupAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // 毎秒音のロード
            fetch(tickSoundFilePath)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
                .then(buffer => {
                    tickAudioBuffer = buffer;
                    console.log("Tick sound loaded.");
                })
                .catch(e => console.error("Error loading tick sound:", e));

            // ★ 0時音のロード
            fetch(finishSoundFilePath)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
                .then(buffer => {
                    finishAudioBuffer = buffer;
                    console.log("Finish sound loaded.");
                })
                .catch(e => console.error("Error loading finish sound:", e));
        }
        document.body.removeEventListener('click', setupAudio);
    }, { once: true });


    // 毎秒音を再生するヘルパー関数
    function playTickSound() {
        if (tickAudioBuffer && audioContext) {
            const source = audioContext.createBufferSource();
            source.buffer = tickAudioBuffer;
            source.connect(audioContext.destination);
            source.start(0);
        } else if (tickSound) {
            tickSound.currentTime = 0;
            tickSound.play().catch(e => console.log("Tick audio playback blocked:", e));
        }
    }

    // ★ 0時音を再生するヘルパー関数
    function playFinishSound() {
        if (finishAudioBuffer && audioContext) {
            const source = audioContext.createBufferSource();
            source.buffer = finishAudioBuffer;
            source.connect(audioContext.destination);
            source.start(0);
            console.log("Finish sound played.");
        } else if (finishSound) {
            finishSound.currentTime = 0;
            finishSound.play().catch(e => console.log("Finish audio playback blocked:", e));
        }
    }


    const GIF_FADE_IN_DURATION = 1 * 1000;
    const GIF_DISPLAY_DURATION = 3 * 1000;
    const GIF_FADE_OUT_DURATION = 1 * 1000;
    const GIF_TOTAL_VISIBLE_DURATION = GIF_FADE_IN_DURATION + GIF_DISPLAY_DURATION;
    const GIF_CHANGE_INTERVAL = 60 * 1000;

    let currentGifTimeoutId = null;
    let nextGifTimeoutId = null;

    function displayAndFadeOutRandomGif() {
        if (gifPaths.length === 0) {
            console.warn("表示するGIFがありません。gifPaths配列を確認してください。");
            return;
        }

        if (currentGifTimeoutId) clearTimeout(currentGifTimeoutId);
        if (nextGifTimeoutId) clearTimeout(nextGifTimeoutId);

        const randomIndex = Math.floor(Math.random() * gifPaths.length);
        const randomGifPath = gifPaths[randomIndex];
        randomGifElement.src = randomGifPath;

        randomGifElement.onload = () => {
            randomGifElement.style.opacity = '1';
        };
        currentGifTimeoutId = setTimeout(() => {
            if (randomGifElement.src === randomGifPath) {
                randomGifElement.style.opacity = '1';
            }
        }, 50);

        currentGifTimeoutId = setTimeout(() => {
            randomGifElement.style.opacity = '0';
            currentGifTimeoutId = setTimeout(() => {
                randomGifElement.src = '';
            }, GIF_FADE_OUT_DURATION);
        }, GIF_FADE_IN_DURATION + GIF_DISPLAY_DURATION);
    }

    function updateStopwatch() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const timeLeft = tomorrow.getTime() - now.getTime();

        if (timeLeft <= 0) {
            hoursSpan.textContent = '00';
            minutesSpan.textContent = '00';
            secondsSpan.textContent = '00';

            // ★ 0時になったら音を鳴らす処理をここに追加 ★
            if (!finishSoundPlayed) { // 音がまだ鳴っていない場合のみ
                playFinishSound();
                finishSoundPlayed = true; // 音を鳴らしたフラグを立てる
            }

            clearInterval(timerInterval);
            clearInterval(gifInterval);
            if (currentGifTimeoutId) clearTimeout(currentGifTimeoutId);
            if (nextGifTimeoutId) clearTimeout(nextGifTimeoutId);
            randomGifElement.style.opacity = '0';
            randomGifElement.src = '';
            console.log("翌日の午前0時になりました！");
            return;
        }

        const totalSeconds = Math.floor(timeLeft / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);

        hoursSpan.textContent = String(hours).padStart(2, '0');
        minutesSpan.textContent = String(minutes).padStart(2, '0');
        secondsSpan.textContent = String(seconds).padStart(2, '0');

        playTickSound(); // 毎秒音を鳴らす
    }

    // --- 初期表示とsetIntervalの設定 ---

    displayAndFadeOutRandomGif();
    const gifInterval = setInterval(displayAndFadeOutRandomGif, GIF_CHANGE_INTERVAL);

    updateStopwatch();
    const timerInterval = setInterval(updateStopwatch, 1000);
});