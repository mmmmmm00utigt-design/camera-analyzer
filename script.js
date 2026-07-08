// ==========================================
// 1. تعريف العناصر الأساسية من الواجهة
// ==========================================
const video = document.getElementById('video');
const sysStatus = document.getElementById('sysStatus');
const faceCount = document.getElementById('faceCount');
const ageEl = document.getElementById('age');
const expressionEl = document.getElementById('expression');

// ==========================================
// 2. دالة تشغيل كاميرا الجهاز
// ==========================================
async function startCamera() {
    try {
        // طلب الإذن لاستخدام الكاميرا من المتصفح
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        video.srcObject = stream;
    } catch (err) {
        console.error("حدث خطأ أثناء فتح الكاميرا:", err);
        sysStatus.innerText = "تعذر الوصول للكاميرا";
        sysStatus.style.color = "#ff0055";
    }
}

// ==========================================
// 3. تحميل نماذج الذكاء الاصطناعي (Face-API)
// ==========================================
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'),
    faceapi.nets.faceExpressionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'),
    faceapi.nets.ageGenderNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model')
]).then(() => {
    sysStatus.innerText = "النظام جاهز للتحليل";
    sysStatus.style.color = "#00f3ff";
    startCamera(); // تشغيل الكاميرا بعد اكتمال التحميل
}).catch(err => {
    console.error("خطأ في تحميل نماذج الذكاء الاصطناعي:", err);
    sysStatus.innerText = "فشل تحميل النماذج";
});

// ==========================================
// 4. معالجة وتتبع الفيديو وتوليد التحليلات
// ==========================================
video.addEventListener('play', () => {
    // إنشاء طبقة Canvas رسم فوق الكاميرا
    const canvas = faceapi.createCanvasFromMedia(video);
    document.querySelector('.camera-container').append(canvas);
    
    const displaySize = { width: video.clientWidth, height: video.clientHeight };
    faceapi.matchDimensions(canvas, displaySize);

    // قاموس ترجمة المشاعر للغة العربية
    const expressionsAr = {
        neutral: 'محايد / هادئ',
        happy: 'سعيد',
        sad: 'حزين',
        angry: 'غاضب',
        fearful: 'متفاجئ / متوتر',
        disgusted: 'منزعج',
        surprised: 'مندهش'
    };

    // حلقة التكرار للتحليل المستمر (كل 100 ملي ثانية)
    setInterval(async () => {
        // اكتشاف الوجوه وتحديد الأعمار والمشاعر
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions()
            .withAgeAndGender();

        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        // مسح الإطارات القديمة ورسم الإطارات المحدثة
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resizedDetections);

        // تحديث البيانات الإحصائية في لوحة الواجهة
        faceCount.innerText = detections.length;

        if (detections.length > 0) {
            const person = detections[0];
            
            // تحديد الشعور الأعلى نسبة عند الشخص
            const expressions = person.expressions;
            const maxExpression = Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);

            // طباعة العمر والمزاج
            ageEl.innerText = `${Math.round(person.age)} سنة`;
            expressionEl.innerText = expressionsAr[maxExpression] || maxExpression;
        } else {
            // إعادة الضغط عند عدم وجود أي شخص أمام الكاميرا
            ageEl.innerText = '--';
            expressionEl.innerText = '--';
        }
    }, 100);
});
