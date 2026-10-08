# 🧠 BrainTumorAI

An AI-assisted brain MRI classification project using deep learning and
Convolutional Neural Networks (CNNs) to classify brain MRI images into
four categories:

-   Glioma
-   Meningioma
-   No Tumor
-   Pituitary Tumor

> **Project status:** CNN baseline completed. Transfer learning,
> explainable AI (Grad-CAM), tumor segmentation, and web application
> development are planned next.

## 📌 Overview

BrainTumorAI is designed as a computer vision and deep learning project
for brain MRI image classification. The current baseline model uses a
CNN trained from scratch to learn visual features from MRI images and
predict one of four classes.

The project uses a separate validation set for model development and
keeps the provided testing set separate for final evaluation.

The current CNN baseline achieved:

  Metric                      Result
  --------------------- ------------
  Test Accuracy           **88.56%**
  Macro F1-Score            **0.88**
  Glioma Recall             **0.75**
  Meningioma F1-Score       **0.85**
  No Tumor F1-Score         **0.92**
  Pituitary F1-Score        **0.94**

The baseline results provide a reference point for future
transfer-learning models.

## 🎯 Objectives

-   Classify brain MRI images into four categories.
-   Build a reliable CNN baseline model.
-   Compare the baseline with transfer-learning architectures.
-   Analyze model performance using accuracy, precision, recall,
    F1-score, and confusion matrices.
-   Add explainability using Grad-CAM.
-   Investigate tumor segmentation using U-Net.
-   Develop a web-based interface for model inference.
-   Provide an AI-assisted research/screening tool rather than a
    definitive medical diagnosis system.

## 📊 Dataset

The dataset is organized into separate training and testing directories.

### Classes

``` text
glioma
meningioma
notumor
pituitary
```

### Dataset split

The original training set contains 5,600 images:

``` text
Training images:    5,600
Validation images:  1,120
CNN training:       4,480
Testing images:     1,600
```

The training set was split using stratified sampling:

``` text
5,600 training images
        │
        ├── 80% → 4,480 training
        │
        └── 20% → 1,120 validation

1,600 testing images
        │
        └── final evaluation
```

Each class is balanced in the original dataset.

> **Note:** The MRI dataset is not included in this repository. Dataset
> licensing and redistribution requirements should be respected.

## 🔧 Preprocessing

The preprocessing pipeline prepares the MRI images for CNN training.

### Pipeline

``` text
Original MRI
     ↓
Read image
     ↓
Convert to RGB
     ↓
Resize with aspect-ratio preservation
     ↓
Pad to 224 × 224
     ↓
Convert to float32
     ↓
Normalize pixels to 0–1
     ↓
TensorFlow Dataset
```

Images are resized using `resize_with_pad` rather than directly
stretching them to 224×224. This helps preserve the original aspect
ratio.

Final input shape:

``` text
224 × 224 × 3
```

Pixel range:

``` text
0.0 – 1.0
```

The TensorFlow data pipeline uses:

-   Batch size: 32
-   Shuffling for training
-   Prefetching with `tf.data.AUTOTUNE`

## 🧠 CNN Baseline

The current baseline is a CNN trained from scratch.

### Architecture

``` text
Input: 224 × 224 × 3
        │
        ▼
Conv2D (32 filters)
        │
MaxPooling2D
        │
        ▼
Conv2D (64 filters)
        │
MaxPooling2D
        │
        ▼
Conv2D (128 filters)
        │
MaxPooling2D
        │
        ▼
Conv2D (256 filters)
        │
MaxPooling2D
        │
        ▼
Flatten
        │
        ▼
Dense (256)
        │
Dropout (0.5)
        │
        ▼
Dense (4)
        │
        ▼
Softmax
```

### Training configuration

``` text
Optimizer: Adam
Learning rate: 0.001
Loss: Sparse Categorical Crossentropy
Metric: Accuracy
Batch size: 32
Maximum epochs: 20
Early stopping patience: 5
```

Early stopping is used to reduce unnecessary training and restore the
best validation weights.

## 📈 Baseline Results

The CNN reached approximately 98% training accuracy while validation
accuracy reached approximately 95%. The final evaluation on the held-out
test set achieved:

``` text
Test Accuracy: 88.56%
Macro F1-Score: 0.88
```

The class-level results were:

  Class          Precision   Recall   F1-Score
  ------------ ----------- -------- ----------
  Glioma              0.93     0.75       0.83
  Meningioma          0.82     0.88       0.85
  No Tumor            0.85     1.00       0.92
  Pituitary           0.97     0.92       0.94

### Key observation

The main weakness of the baseline is **glioma recall**. The model
correctly identifies many glioma cases, but it also misclassifies a
notable number of glioma images as meningioma or no tumor.

This provides an important direction for the next stage of the project.

## 📊 Evaluation

The baseline model is evaluated using:

-   Accuracy
-   Precision
-   Recall
-   F1-score
-   Confusion matrix
-   Training/validation accuracy curves
-   Training/validation loss curves

The confusion matrix is particularly useful for identifying which tumor
categories are difficult for the model to distinguish.

## 📁 Project Structure

``` text
BrainTumorAI/
│
├── data/
│   ├── raw/
│   │   ├── Training/
│   │   │   ├── glioma/
│   │   │   ├── meningioma/
│   │   │   ├── notumor/
│   │   │   └── pituitary/
│   │   └── Testing/
│   │       ├── glioma/
│   │       ├── meningioma/
│   │       ├── notumor/
│   │       └── pituitary/
│   │
│   └── processed/
│       ├── train.csv
│       ├── validation.csv
│       └── test.csv
│
├── notebooks/
│   ├── 01_dataset_exploration.ipynb
│   ├── 02_preprocessing.ipynb
│   └── 03_cnn_baseline.ipynb
│
├── models/
│   ├── classification/
│   │   └── cnn_baseline.keras
│   └── segmentation/
│
├── outputs/
│   ├── figures/
│   ├── confusion_matrices/
│   ├── predictions/
│   └── gradcam/
│
├── src/
├── tests/
├── requirements.txt
├── .gitignore
└── README.md
```

## 🚀 Installation

### 1. Clone the repository

``` bash
git clone https://github.com/<your-username>/BrainTumorAI.git
cd BrainTumorAI
```

### 2. Create a virtual environment

Python 3.12 is recommended for the project environment.

Windows:

``` powershell
python -m venv venv
venv\Scripts\activate
```

### 3. Install dependencies

``` bash
pip install -r requirements.txt
```

### 4. Add the dataset

Place the dataset inside:

``` text
data/raw/
```

with the following structure:

``` text
data/raw/
├── Training/
│   ├── glioma/
│   ├── meningioma/
│   ├── notumor/
│   └── pituitary/
│
└── Testing/
    ├── glioma/
    ├── meningioma/
    ├── notumor/
    └── pituitary/
```

### 5. Run the notebooks

Start Jupyter:

``` bash
jupyter notebook
```

Then run the notebooks in order:

``` text
01_dataset_exploration.ipynb
02_preprocessing.ipynb
03_cnn_baseline.ipynb
```

## 🛣️ Roadmap

### Completed

-   [x] Project structure
-   [x] Dataset exploration
-   [x] Class distribution analysis
-   [x] Image dimension analysis
-   [x] Train/validation/test preparation
-   [x] Image preprocessing
-   [x] CNN baseline
-   [x] Training and validation analysis
-   [x] Test-set evaluation
-   [x] Classification report
-   [x] Confusion matrix

### Planned

-   [ ] Transfer learning
-   [ ] Model comparison
-   [ ] Final model selection
-   [ ] Hyperparameter optimization
-   [ ] Grad-CAM explainability
-   [ ] Tumor segmentation using U-Net
-   [ ] Prediction interface
-   [ ] Django web application
-   [ ] Prediction history and dashboard
-   [ ] Testing and deployment

## ⚠️ Medical Disclaimer

This project is developed for educational, research, and AI-assisted
screening purposes.

It is **not a medical diagnostic system** and should not be used as a
replacement for evaluation by qualified medical professionals. Model
predictions may contain errors and should not be used alone to make
clinical decisions.

## 🛠️ Technologies

-   Python
-   TensorFlow
-   Keras
-   NumPy
-   Pandas
-   Matplotlib
-   Seaborn
-   Scikit-learn
-   Pillow
-   Jupyter Notebook
-   OpenCV

## 👨‍💻 Author

**Pasindu Piyumal**

BSc (Hons) Data Science

Sri Lanka

------------------------------------------------------------------------

⭐ If you find this project useful, consider giving the repository a
star.
