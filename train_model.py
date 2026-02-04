"""
Bank SMS NER Model Training Script

This script trains a custom spaCy Named Entity Recognition (NER) model
to extract financial entities from Indian bank SMS messages.

Entities trained:
    - AMOUNT: Monetary values
    - DATE: Transaction dates
    - ACCOUNT: Account identifiers
    - TXN_TYPE: Transaction type (debit/credit)

Usage:
    python train_model.py

Output:
    - Trained model saved to ./bank_ner_model directory
    - Test results printed to console
"""

import random
import warnings
from pathlib import Path

import spacy
from spacy.training import Example
from spacy.util import minibatch, compounding

# Import training data from our data module
from train_data import TRAIN_DATA


def create_blank_model():
    """
    Creates a blank English spaCy model and adds the NER pipeline component.
    
    We use a blank model instead of a pre-trained one to:
    1. Have full control over entity types
    2. Avoid conflicts with pre-existing entity labels
    3. Keep the model lightweight and fast
    
    Returns:
        spacy.Language: A blank spaCy model with NER component
    """
    # Create a blank English model
    nlp = spacy.blank("en")
    
    # Add the NER pipeline component
    # 'ner' is the standard Named Entity Recognition component
    ner = nlp.add_pipe("ner", last=True)
    
    # Add our custom entity labels to the NER component
    # These are the financial entities we want to extract
    # Note: MODALITY and MERCHANT detection is handled by keyword-based classify_modality() function
    labels = ["AMOUNT", "DATE", "ACCOUNT", "TXN_TYPE", "BALANCE", "BANK"]
    for label in labels:
        ner.add_label(label)
    
    print(f"[OK] Created blank model with NER component")
    print(f"  Entity labels: {labels}")
    
    return nlp


def train_model(nlp, train_data, n_iter=30, output_dir="./bank_ner_model"):
    """
    Trains the NER model on the provided training data.
    
    Training Process:
    1. Initialize the model's NER component with random weights
    2. For each iteration (epoch):
       - Shuffle training data to prevent order bias
       - Create batches of increasing size (compounding)
       - Update model weights based on prediction errors
       - Track and report loss for monitoring
    
    Args:
        nlp: spaCy language model with NER component
        train_data: List of (text, annotations) tuples
        n_iter: Number of training iterations (epochs)
        output_dir: Directory to save the trained model
    
    Returns:
        spacy.Language: The trained model
    """
    print(f"\n{'='*60}")
    print(f"Starting NER Training")
    print(f"{'='*60}")
    print(f"Training examples: {len(train_data)}")
    print(f"Iterations: {n_iter}")
    print(f"Output directory: {output_dir}\n")
    
    # Get the NER component for disabling other pipes during training
    # This speeds up training by not running unnecessary components
    pipe_exceptions = ["ner"]
    other_pipes = [pipe for pipe in nlp.pipe_names if pipe not in pipe_exceptions]
    
    # Convert training data to spaCy Example objects
    # Example objects pair the raw text with gold-standard annotations
    examples = []
    for text, annotations in train_data:
        doc = nlp.make_doc(text)
        example = Example.from_dict(doc, annotations)
        examples.append(example)
    
    # Initialize the model with the training examples
    # This sets up the internal statistics needed for training
    nlp.initialize(lambda: examples)
    
    # Training loop
    # We use 'with nlp.disable_pipes()' to disable pipes we don't need
    # This is a context manager that re-enables pipes after training
    with nlp.disable_pipes(*other_pipes):
        
        for iteration in range(n_iter):
            # Shuffle training data for each iteration
            # This prevents the model from learning order-dependent patterns
            random.shuffle(examples)
            
            # Track losses for this iteration
            losses = {}
            
            # Create batches with compounding batch sizes
            # compounding(start, stop, compound) creates an iterator that
            # yields values starting at 'start', multiplied by 'compound'
            # each time, up to 'stop'. This helps training stability.
            # Small batches early = more updates, larger batches later = smoother gradients
            batches = minibatch(examples, size=compounding(4.0, 32.0, 1.001))
            
            for batch in batches:
                # Update the model with the batch
                # nlp.update() performs forward pass, computes loss, and backpropagation
                # 
                # Parameters:
                #   - batch: List of Example objects
                #   - drop: Dropout rate for regularization (prevents overfitting)
                #   - losses: Dictionary to accumulate loss values
                nlp.update(
                    batch,
                    drop=0.35,  # 35% dropout rate
                    losses=losses
                )
            
            # Print progress every 5 iterations
            if (iteration + 1) % 5 == 0 or iteration == 0:
                print(f"  Iteration {iteration + 1:3d}/{n_iter} | Loss: {losses.get('ner', 0):.4f}")
    
    print(f"\n[OK] Training completed!")
    
    # Save the trained model to disk
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    nlp.to_disk(output_path)
    print(f"[OK] Model saved to: {output_path.absolute()}")
    
    return nlp


def test_model(model_path, test_texts):
    """
    Loads a trained model and tests it on sample texts.
    
    Args:
        model_path: Path to the saved model directory
        test_texts: List of SMS strings to test
    """
    print(f"\n{'='*60}")
    print(f"Testing Trained Model")
    print(f"{'='*60}\n")
    
    # Load the trained model from disk
    nlp = spacy.load(model_path)
    print(f"[OK] Model loaded from: {model_path}\n")
    
    # Test each sample text
    for i, text in enumerate(test_texts, 1):
        print(f"Test {i}: {text}")
        print("-" * 50)
        
        # Process the text through the model
        doc = nlp(text)
        
        # Extract and display entities
        if doc.ents:
            for ent in doc.ents:
                print(f"  {ent.label_:10s} | {ent.text}")
        else:
            print("  No entities detected")
        
        print()


def main():
    """
    Main function to orchestrate the training pipeline.
    """
    # Suppress warnings for cleaner output
    warnings.filterwarnings("ignore")
    
    print("\n" + "=" * 60)
    print("BANK SMS NER MODEL TRAINING")
    print("=" * 60)
    
    # Step 1: Create blank model with NER component
    nlp = create_blank_model()
    
    # Step 2: Train the model
    # You can adjust n_iter for more/less training
    # More iterations generally improve accuracy but take longer
    trained_model = train_model(
        nlp=nlp,
        train_data=TRAIN_DATA,
        n_iter=30,  # 30 iterations is a good balance for this dataset
        output_dir="./bank_ner_model"
    )
    
    # Step 3: Test the model on unseen examples
    test_texts = [
        "HDFC Bank: Rs. 5,500 credited to your a/c ending 7788 on 14-Dec-2024",
        "SBI Alert: INR 2,000 debited from Acct XX1234 on 13/12/24 for UPI payment",
        "ICICI Bank: Rs.15,000 deposited to account ending 5566 today",
        "Axis Bank: Amount of Rs 899 spent from a/c XX9900 on 12-Dec-24 at Amazon",
    ]
    
    test_model("./bank_ner_model", test_texts)
    
    print("=" * 60)
    print("Training and testing completed successfully!")
    print("=" * 60)


if __name__ == "__main__":
    main()
