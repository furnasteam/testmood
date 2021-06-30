export async function captureVideo() {
    console.log('hi we are here');
    const chunks = [];
    const stream = await navigator.mediaDevices.getDisplayMedia({video: true})
    console.log('stream', stream);
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = function(e) {
        console.log('ondataavailable')
        chunks.push(e.data);
        function download() {
            console.log('download')
            var blob = new Blob(chunks, {
                type: "video/webm"
            });
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            document.body.appendChild(a);
            a.style = "display: none";
            a.href = url;
            a.download = "test.webm";
            a.click();
            window.URL.revokeObjectURL(url);
        }
        download();
    }
    mediaRecorder.start();
    setTimeout(() => {
        mediaRecorder.stop();
    }, 5000)
    // navigator.mediaDevices.getUserMedia({
    //     video: {
    //         mandatory: {
    //             // chromeMediaSource: 'desktop',
    //             chromeMediaSourceId: streamId,
    //             // // You can provide additional constraints. For example,
    //             // maxWidth: 1920,
    //             // maxHeight: 1080,
    //             // maxFrameRate: 10,
    //             // minAspectRatio: 1.77
    //         }
    //     }
    // });
}