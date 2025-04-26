import openai
from openai import OpenAI

# ✅ Use your actual API key here
client = OpenAI(api_key=process.env.OPENAI_API_KEY)

def test_openai_key():
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "user", "content": "Respond with a JSON message that says hello world."}
            ],
            temperature=0.2
        )

        reply = response.choices[0].message.content
        print("✅ OpenAI API is working!")
        print("🔁 Response:\n", reply)

    except Exception as e:
        print("❌ Error:", str(e))

if __name__ == "__main__":
    test_openai_key()
